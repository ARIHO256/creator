import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearSession, useSession } from "../../auth/session";
import { recordOnboardingStatus } from "./onboardingStatus";
import { sellerBackendApi } from "../../lib/backendApi";
import { authClient } from "../../lib/authApi";
import { useSellerTaxonomy } from "../../data/taxonomy";
import SellerOnboardingTaxonomyNavigator from "./SellerOnboardingTaxonomyNavigator";
import { useLocalization } from "../../localization/LocalizationProvider";
import { useThemeMode } from "../../theme/themeMode";

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
} from "@mui/material";

// Seller Onboarding (EVzone Marketplace) — Super Premium (v4)
// Route: /seller/onboarding
// Focus: Premium UX, clear step completion, strong validation, doc requirements, payout/tax, shipping/policy presets.
// Notes:
// - UI-first: hook your backend for slug availability, KYC/OTP, file uploads, and admin approvals.
// - Reads legacy draft key (seller_onb_pro_v3) and writes to v4 key. Keeps review timeline key (seller_onb_review_v1).

function ts() {
  const d = new Date();
  return d.toLocaleTimeString().slice(0, 5);
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const BRAND = {
  green: "#03CD8C",
  orange: "#F77F00",
  slate900: "#0F172A",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748B",
  slate300: "#CBD5E1",
  bg0: "#F6FFFB",
  bg1: "#F5F7FF",
  surface: "#FFFFFF",
};

const EV_COLORS = {
  primary: BRAND.green,
  primarySoft: "var(--ev-primary-soft)",
  primaryStrong: "#059669",
  accent: BRAND.orange,
  accentSoft: "var(--ev-accent-soft)",
  bg: "var(--ev-surface-page)",
  surface: "var(--ev-surface)",
  surfaceAlt: "var(--ev-surface-alt)",
  border: "var(--ev-border-strong)",
  textMain: "var(--ev-text-main)",
  textSubtle: "var(--ev-text-subtle)",
  textMuted: "var(--ev-text-muted)",
};

const STORAGE = {
  form: "seller_onb_pro_v4",
  legacy: "seller_onb_pro_v3",
  review: "seller_onb_review_v1",
  ui: "seller_onb_ui_v1",
};

const RESERVED_SLUGS = [
  "admin",
  "support",
  "help",
  "market",
  "marketplace",
  "seller",
  "buyers",
  "checkout",
  "evzone",
  "evzonepay",
  "terms",
  "privacy",
  "policies",
  "settings",
  "billing",
];

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "sw", label: "Swahili" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
];

const LANGS = LANGUAGE_OPTIONS;

const DEFAULT_DIAL_CODE = "+256";

type TaxonomySelection = {
  nodeId: string;
  label?: string;
  path?: string[];
  slug?: string;
  pathNodes?: Array<{ id: string; name: string; type: string }>;
  [key: string]: unknown;
};
type DocItem = {
  id: string;
  type: string;
  name?: string;
  file?: string;
  fileUrl?: string;
  status?: string;
  expiry?: string;
  uploadedAt?: string;
  notes?: string;
};
type SupportInfo = {
  whatsapp: string;
  email: string;
  phone: string;
};
type ShipFrom = {
  country: string;
  province: string;
  city: string;
  address1: string;
  address2: string;
  postalCode: string;
};
type ShippingForm = {
  profileId: string;
  expressReady: boolean;
  handlingTimeDays: string;
};
type PoliciesForm = {
  returnsDays: string;
  warrantyDays: string;
  termsUrl: string;
  privacyUrl: string;
  policyNotes: string;
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
  notificationsEmail: string;
  notificationsWhatsApp: string;
  confirmDetails: boolean;
  otherDetails?: string;
  otherDescription?: string;
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
  sellerTerms: boolean;
  contentPolicy: boolean;
  dataProcessing: boolean;
};
type SellerForm = {
  owner: string;
  status: string;
  storeName: string;
  storeSlug: string;
  email: string;
  phone: string;
  website: string;
  about: string;
  brandColor: string;
  logoUrl: string;
  coverUrl: string;
  support: SupportInfo;
  shipFrom: ShipFrom;
  channels: string[];
  languages: string[];
  taxonomySelection: TaxonomySelection | null;
  taxonomySelections: TaxonomySelection[];
  docs: { list: DocItem[] };
  shipping: ShippingForm;
  policies: PoliciesForm;
  payout: PayoutForm;
  tax: TaxForm;
  acceptance: AcceptanceForm;
};
type CountryDialOption = {
  value: string;
  label: string;
  name: string;
  code: string;
  search: string;
};
type ShippingProfile = { id: string; name: string; isDefault?: boolean; archived?: boolean };
type LabeledValueOption = { value: string; label: string; helper?: string };
type PolicyPresetOption = {
  id: string;
  label: string;
  desc: string;
  patch: {
    returnsDays: string;
    warrantyDays: string;
    handlingTimeDays: string;
  };
};
type OnboardingLookups = {
  payoutMethods: LabeledValueOption[];
  payoutCurrencies: string[];
  payoutRhythms: LabeledValueOption[];
  mobileMoneyProviders: LabeledValueOption[];
  mobileIdTypes: LabeledValueOption[];
  payoutRegions: {
    alipay: LabeledValueOption[];
    wechat: LabeledValueOption[];
  };
  policyPresets: PolicyPresetOption[];
};
type ToastState = { tone?: "success" | "error" | "info"; title: string; message?: string };

export const COUNTRY_DIAL_CODES = [
  { code: "AF", name: "Afghanistan", dial: "+93", flag: "🇦🇫" },
  { code: "AX", name: "Åland Islands", dial: "+358", flag: "🇦🇽" },
  { code: "AL", name: "Albania (Shqipëri)", dial: "+355", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", dial: "+213", flag: "🇩🇿" },
  { code: "AS", name: "American Samoa", dial: "+1684", flag: "🇦🇸" },
  { code: "AD", name: "Andorra", dial: "+376", flag: "🇦🇩" },
  { code: "AO", name: "Angola", dial: "+244", flag: "🇦🇴" },
  { code: "AI", name: "Anguilla", dial: "+1264", flag: "🇦🇮" },
  { code: "AQ", name: "Antarctica", dial: "+672", flag: "🇦🇶" },
  { code: "AG", name: "Antigua and Barbuda", dial: "+1268", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "AM", name: "Armenia (Հայաստան)", dial: "+374", flag: "🇦🇲" },
  { code: "AW", name: "Aruba", dial: "+297", flag: "🇦🇼" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "AT", name: "Austria (Österreich)", dial: "+43", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan (Azərbaycan)", dial: "+994", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", dial: "+1242", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh (বাংলাদেশ)", dial: "+880", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", dial: "+1246", flag: "🇧🇧" },
  { code: "BY", name: "Belarus (Беларусь)", dial: "+375", flag: "🇧🇾" },
  { code: "BE", name: "Belgium (België)", dial: "+32", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", dial: "+501", flag: "🇧🇿" },
  { code: "BJ", name: "Benin (Bénin)", dial: "+229", flag: "🇧🇯" },
  { code: "BM", name: "Bermuda", dial: "+1441", flag: "🇧🇲" },
  { code: "BT", name: "Bhutan (འབྲུག)", dial: "+975", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", dial: "+591", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina (Босна и Херцеговина)", dial: "+387", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", dial: "+267", flag: "🇧🇼" },
  { code: "BV", name: "Bouvet Island", dial: "+47", flag: "🇧🇻" },
  { code: "BR", name: "Brazil (Brasil)", dial: "+55", flag: "🇧🇷" },
  { code: "IO", name: "British Indian Ocean Territory", dial: "+246", flag: "🇮🇴" },
  { code: "VG", name: "British Virgin Islands", dial: "+1284", flag: "🇻🇬" },
  { code: "BN", name: "Brunei", dial: "+673", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria (България)", dial: "+359", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", dial: "+226", flag: "🇧🇫" },
  { code: "BI", name: "Burundi (Uburundi)", dial: "+257", flag: "🇧🇮" },
  { code: "KH", name: "Cambodia (កម្ពុជា)", dial: "+855", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon (Cameroun)", dial: "+237", flag: "🇨🇲" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "CV", name: "Cape Verde (Kabu Verdi)", dial: "+238", flag: "🇨🇻" },
  { code: "BQ", name: "Caribbean Netherlands", dial: "+599", flag: "🇧🇶" },
  { code: "KY", name: "Cayman Islands", dial: "+1345", flag: "🇰🇾" },
  { code: "CF", name: "Central African Republic (République centrafricaine)", dial: "+236", flag: "🇨🇫" },
  { code: "TD", name: "Chad (Tchad)", dial: "+235", flag: "🇹🇩" },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
  { code: "CN", name: "China (中国)", dial: "+86", flag: "🇨🇳" },
  { code: "CX", name: "Christmas Island", dial: "+61", flag: "🇨🇽" },
  { code: "CC", name: "Cocos (Keeling) Islands", dial: "+61", flag: "🇨🇨" },
  { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", dial: "+269", flag: "🇰🇲" },
  { code: "CD", name: "Congo (DRC) (Jamhuri ya Kidemokrasia ya Kongo)", dial: "+243", flag: "🇨🇩" },
  { code: "CG", name: "Congo (Republic) (Congo-Brazzaville)", dial: "+242", flag: "🇨🇬" },
  { code: "CK", name: "Cook Islands", dial: "+682", flag: "🇨🇰" },
  { code: "CR", name: "Costa Rica", dial: "+506", flag: "🇨🇷" },
  { code: "CI", name: "Côte d’Ivoire", dial: "+225", flag: "🇨🇮" },
  { code: "HR", name: "Croatia (Hrvatska)", dial: "+385", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", dial: "+53", flag: "🇨🇺" },
  { code: "CW", name: "Curaçao", dial: "+599", flag: "🇨🇼" },
  { code: "CY", name: "Cyprus (Κύπρος)", dial: "+357", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic (Česká republika)", dial: "+420", flag: "🇨🇿" },
  { code: "DK", name: "Denmark (Danmark)", dial: "+45", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", dial: "+253", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", dial: "+1767", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic (República Dominicana)", dial: "+1", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", dial: "+593", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", dial: "+503", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea (Guinea Ecuatorial)", dial: "+240", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", dial: "+291", flag: "🇪🇷" },
  { code: "EE", name: "Estonia (Eesti)", dial: "+372", flag: "🇪🇪" },
  { code: "ET", name: "Ethiopia", dial: "+251", flag: "🇪🇹" },
  { code: "FK", name: "Falkland Islands (Islas Malvinas)", dial: "+500", flag: "🇫🇰" },
  { code: "FO", name: "Faroe Islands (Føroyar)", dial: "+298", flag: "🇫🇴" },
  { code: "FJ", name: "Fiji", dial: "+679", flag: "🇫🇯" },
  { code: "FI", name: "Finland (Suomi)", dial: "+358", flag: "🇫🇮" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "GF", name: "French Guiana (Guyane française)", dial: "+594", flag: "🇬🇫" },
  { code: "PF", name: "French Polynesia (Polynésie française)", dial: "+689", flag: "🇵🇫" },
  { code: "TF", name: "French Southern and Antarctic Lands", dial: "+262", flag: "🇹🇫" },
  { code: "GA", name: "Gabon", dial: "+241", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", dial: "+220", flag: "🇬🇲" },
  { code: "GE", name: "Georgia (საქართველო)", dial: "+995", flag: "🇬🇪" },
  { code: "DE", name: "Germany (Deutschland)", dial: "+49", flag: "🇩🇪" },
  { code: "GH", name: "Ghana (Gaana)", dial: "+233", flag: "🇬🇭" },
  { code: "GI", name: "Gibraltar", dial: "+350", flag: "🇬🇮" },
  { code: "GR", name: "Greece (Ελλάδα)", dial: "+30", flag: "🇬🇷" },
  { code: "GL", name: "Greenland (Kalaallit Nunaat)", dial: "+299", flag: "🇬🇱" },
  { code: "GD", name: "Grenada", dial: "+1473", flag: "🇬🇩" },
  { code: "GP", name: "Guadeloupe", dial: "+590", flag: "🇬🇵" },
  { code: "GU", name: "Guam", dial: "+1671", flag: "🇬🇺" },
  { code: "GT", name: "Guatemala", dial: "+502", flag: "🇬🇹" },
  { code: "GG", name: "Guernsey", dial: "+44", flag: "🇬🇬" },
  { code: "GN", name: "Guinea (Guinée)", dial: "+224", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau (Guiné Bissau)", dial: "+245", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", dial: "+592", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", dial: "+509", flag: "🇭🇹" },
  { code: "HM", name: "Heard Island and McDonald Islands", dial: "+672", flag: "🇭🇲" },
  { code: "HN", name: "Honduras", dial: "+504", flag: "🇭🇳" },
  { code: "HK", name: "Hong Kong (香港)", dial: "+852", flag: "🇭🇰" },
  { code: "HU", name: "Hungary (Magyarország)", dial: "+36", flag: "🇭🇺" },
  { code: "IS", name: "Iceland (Ísland)", dial: "+354", flag: "🇮🇸" },
  { code: "IN", name: "India (भारत)", dial: "+91", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { code: "IR", name: "Iran", dial: "+98", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", dial: "+964", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "IM", name: "Isle of Man", dial: "+44", flag: "🇮🇲" },
  { code: "IL", name: "Israel (‫ישראל‬‎)", dial: "+972", flag: "🇮🇱" },
  { code: "IT", name: "Italy (Italia)", dial: "+39", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", dial: "+1876", flag: "🇯🇲" },
  { code: "JP", name: "Japan (日本)", dial: "+81", flag: "🇯🇵" },
  { code: "JE", name: "Jersey", dial: "+44", flag: "🇯🇪" },
  { code: "JO", name: "Jordan", dial: "+962", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan (Казахстан)", dial: "+7", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", dial: "+686", flag: "🇰🇮" },
  { code: "XK", name: "Kosovo", dial: "+383", flag: "🇽🇰" },
  { code: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan (Кыргызстан)", dial: "+996", flag: "🇰🇬" },
  { code: "LA", name: "Laos (ລາວ)", dial: "+856", flag: "🇱🇦" },
  { code: "LV", name: "Latvia (Latvija)", dial: "+371", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", dial: "+961", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", dial: "+266", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", dial: "+231", flag: "🇱🇷" },
  { code: "LY", name: "Libya", dial: "+218", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", dial: "+423", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania (Lietuva)", dial: "+370", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", dial: "+352", flag: "🇱🇺" },
  { code: "MO", name: "Macau (澳門)", dial: "+853", flag: "🇲🇴" },
  { code: "MK", name: "Macedonia (FYROM) (Македонија)", dial: "+389", flag: "🇲🇰" },
  { code: "MG", name: "Madagascar (Madagasikara)", dial: "+261", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", dial: "+265", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", dial: "+960", flag: "🇲🇻" },
  { code: "ML", name: "Mali", dial: "+223", flag: "🇲🇱" },
  { code: "MT", name: "Malta", dial: "+356", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", dial: "+692", flag: "🇲🇭" },
  { code: "MQ", name: "Martinique", dial: "+596", flag: "🇲🇶" },
  { code: "MR", name: "Mauritania", dial: "+222", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius (Moris)", dial: "+230", flag: "🇲🇺" },
  { code: "YT", name: "Mayotte", dial: "+262", flag: "🇾🇹" },
  { code: "MX", name: "Mexico (México)", dial: "+52", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", dial: "+691", flag: "🇫🇲" },
  { code: "MD", name: "Moldova (Republica Moldova)", dial: "+373", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", dial: "+377", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia (Монгол)", dial: "+976", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro (Crna Gora)", dial: "+382", flag: "🇲🇪" },
  { code: "MS", name: "Montserrat", dial: "+1664", flag: "🇲🇸" },
  { code: "MA", name: "Morocco", dial: "+212", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique (Moçambique)", dial: "+258", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar (Burma) (မြန်မာ)", dial: "+95", flag: "🇲🇲" },
  { code: "NA", name: "Namibia (Namibië)", dial: "+264", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", dial: "+674", flag: "🇳🇷" },
  { code: "NP", name: "Nepal (नेपाल)", dial: "+977", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands (Nederland)", dial: "+31", flag: "🇳🇱" },
  { code: "NC", name: "New Caledonia (Nouvelle-Calédonie)", dial: "+687", flag: "🇳🇨" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", dial: "+505", flag: "🇳🇮" },
  { code: "NE", name: "Niger (Nijar)", dial: "+227", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "NU", name: "Niue", dial: "+683", flag: "🇳🇺" },
  { code: "NF", name: "Norfolk Island", dial: "+672", flag: "🇳🇫" },
  { code: "KP", name: "North Korea (조선 민주주의 인민 공화국)", dial: "+850", flag: "🇰🇵" },
  { code: "MP", name: "Northern Mariana Islands", dial: "+1670", flag: "🇲🇵" },
  { code: "NO", name: "Norway (Norge)", dial: "+47", flag: "🇳🇴" },
  { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "PW", name: "Palau", dial: "+680", flag: "🇵🇼" },
  { code: "PS", name: "Palestine", dial: "+970", flag: "🇵🇸" },
  { code: "PA", name: "Panama (Panamá)", dial: "+507", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", dial: "+675", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", dial: "+595", flag: "🇵🇾" },
  { code: "PE", name: "Peru (Perú)", dial: "+51", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { code: "PN", name: "Pitcairn Islands", dial: "+64", flag: "🇵🇳" },
  { code: "PL", name: "Poland (Polska)", dial: "+48", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "PR", name: "Puerto Rico", dial: "+1", flag: "🇵🇷" },
  { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦" },
  { code: "RE", name: "Réunion (La Réunion)", dial: "+262", flag: "🇷🇪" },
  { code: "RO", name: "Romania (România)", dial: "+40", flag: "🇷🇴" },
  { code: "RU", name: "Russia (Россия)", dial: "+7", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", dial: "+250", flag: "🇷🇼" },
  { code: "BL", name: "Saint Barthélemy (Saint-Barthélemy)", dial: "+590", flag: "🇧🇱" },
  { code: "SH", name: "Saint Helena", dial: "+290", flag: "🇸🇭" },
  { code: "KN", name: "Saint Kitts and Nevis", dial: "+1869", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", dial: "+1758", flag: "🇱🇨" },
  { code: "MF", name: "Saint Martin (Saint-Martin (partie française))", dial: "+590", flag: "🇲🇫" },
  { code: "PM", name: "Saint Pierre and Miquelon (Saint-Pierre-et-Miquelon)", dial: "+508", flag: "🇵🇲" },
  { code: "VC", name: "Saint Vincent and the Grenadines", dial: "+1784", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", dial: "+685", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", dial: "+378", flag: "🇸🇲" },
  { code: "ST", name: "São Tomé and Príncipe (São Tomé e Príncipe)", dial: "+239", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "SN", name: "Senegal (Sénégal)", dial: "+221", flag: "🇸🇳" },
  { code: "RS", name: "Serbia (Србија)", dial: "+381", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", dial: "+248", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", dial: "+232", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { code: "SX", name: "Sint Maarten", dial: "+1721", flag: "🇸🇽" },
  { code: "SK", name: "Slovakia (Slovensko)", dial: "+421", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia (Slovenija)", dial: "+386", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", dial: "+677", flag: "🇸🇧" },
  { code: "SO", name: "Somalia (Soomaaliya)", dial: "+252", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "GS", name: "South Georgia and the South Sandwich Islands", dial: "+500", flag: "🇬🇸" },
  { code: "KR", name: "South Korea (대한민국)", dial: "+82", flag: "🇰🇷" },
  { code: "SS", name: "South Sudan", dial: "+211", flag: "🇸🇸" },
  { code: "ES", name: "Spain (España)", dial: "+34", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka (ශ්‍රී ලංකාව)", dial: "+94", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", dial: "+249", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", dial: "+597", flag: "🇸🇷" },
  { code: "SJ", name: "Svalbard and Jan Mayen", dial: "+47", flag: "🇸🇯" },
  { code: "SZ", name: "Swaziland", dial: "+268", flag: "🇸🇿" },
  { code: "SE", name: "Sweden (Sverige)", dial: "+46", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland (Schweiz)", dial: "+41", flag: "🇨🇭" },
  { code: "SY", name: "Syria", dial: "+963", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan (台灣)", dial: "+886", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", dial: "+992", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", dial: "+255", flag: "🇹🇿" },
  { code: "TH", name: "Thailand (ไทย)", dial: "+66", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", dial: "+670", flag: "🇹🇱" },
  { code: "TG", name: "Togo", dial: "+228", flag: "🇹🇬" },
  { code: "TK", name: "Tokelau", dial: "+690", flag: "🇹🇰" },
  { code: "TO", name: "Tonga", dial: "+676", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", dial: "+1868", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", dial: "+216", flag: "🇹🇳" },
  { code: "TR", name: "Turkey (Türkiye)", dial: "+90", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", dial: "+993", flag: "🇹🇲" },
  { code: "TC", name: "Turks and Caicos Islands", dial: "+1649", flag: "🇹🇨" },
  { code: "TV", name: "Tuvalu", dial: "+688", flag: "🇹🇻" },
  { code: "VI", name: "U.S. Virgin Islands", dial: "+1340", flag: "🇻🇮" },
  { code: "UG", name: "Uganda", dial: "+256", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine (Україна)", dial: "+380", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "UM", name: "United States Minor Outlying Islands", dial: "+1", flag: "🇺🇲" },
  { code: "UY", name: "Uruguay", dial: "+598", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan (Oʻzbekiston)", dial: "+998", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", dial: "+678", flag: "🇻🇺" },
  { code: "VA", name: "Vatican City (Città del Vaticano)", dial: "+39", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", dial: "+58", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam (Việt Nam)", dial: "+84", flag: "🇻🇳" },
  { code: "WF", name: "Wallis and Futuna", dial: "+681", flag: "🇼🇫" },
  { code: "EH", name: "Western Sahara", dial: "+212", flag: "🇪🇭" },
  { code: "YE", name: "Yemen", dial: "+967", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", dial: "+260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", dial: "+263", flag: "🇿🇼" },
];

export const COUNTRY_DIAL_OPTIONS: CountryDialOption[] = COUNTRY_DIAL_CODES.map((item) => ({
  value: item.dial,
  label: `${item.flag} ${item.dial}`,
  name: item.name,
  code: item.code,
  search: `${item.name} ${item.dial} ${item.code}`.toLowerCase(),
}));



const CHANNEL_OPTIONS = [
  {
    id: "marketplace_retail",
    label: "Marketplace Retail",
    desc: "Public listings, cart checkout, promos and reviews.",
  },
  {
    id: "wholesale_b2b",
    label: "Wholesale / B2B",
    desc: "MOQ pricing, quote requests, proforma invoices.",
  },
  {
    id: "live_dealz",
    label: "Live Dealz",
    desc: "Host live sessions with creators and flash offers.",
  },
  {
    id: "shoppable_adz",
    label: "Shoppable Adz",
    desc: "Shareable deal links with fast checkout.",
  },
  {
    id: "whatsapp_orders",
    label: "WhatsApp Orders",
    desc: "Capture orders through WhatsApp and confirm digitally.",
  },
  {
    id: "phone_orders",
    label: "Phone Orders",
    desc: "Receive orders by call and confirm with order links.",
  },
];

const REQUIRED_DOC_TYPES = [
  "Business Registration",
  "Business License",
  "National ID/Passport",
  "Tax Certificate/VAT",
];

const OPTIONAL_DOC_TYPES = [
  "Certificate of Incorporation",
  "Director/Owner ID",
  "Proof of Address",
  "Utility Bill",
  "Import/Export License",
  "Customs Registration",
  "Product Liability Insurance",
  "Public Liability Insurance",
  "Warehouse License",
  "Brand Authorization",
  "Trademark Certificate",
  "Distribution Agreement",
  "Reseller Certificate",
  "Manufacturer Certificate",
  "Product Certificates (CE/UN38.3/etc)",
  "Safety/Compliance Certificate",
  "Material Safety Data Sheet (MSDS)",
  "Quality Certificate (ISO)",
  "Warranty Policy",
  "Returns Policy",
  "Privacy Policy",
  "Terms & Conditions",
  "Pricing List",
  "Other",
];

const DOC_TYPES = [...REQUIRED_DOC_TYPES, ...OPTIONAL_DOC_TYPES];

const IconShell = ({ children }) => (
  <Box
    component="span"
    className="inline-flex items-center justify-center"
    sx={{ fontSize: "0.85rem", lineHeight: 1 }}
  >
    {children}
  </Box>
);

const IconBank = () => <IconShell>🏦</IconShell>;
const IconWallet = () => <IconShell>📱</IconShell>;
const IconGlobe = () => <IconShell>🌐</IconShell>;
const IconClock = () => <IconShell>⏱</IconShell>;
const IconShield = () => <IconShell>🛡️</IconShell>;
const IconSparkles = () => <IconShell>✨</IconShell>;
const IconCheck = () => <IconShell>✅</IconShell>;
const IconWarn = () => <IconShell>⚠️</IconShell>;

const DEFAULT_PAYOUT_METHODS: LabeledValueOption[] = [
  {
    value: "bank_account",
    label: "Bank account",
    icon: <IconBank />,
    helper: "Local or international bank settlement.",
  },
  {
    value: "mobile_money",
    label: "Mobile money",
    icon: <IconWallet />,
    helper: "MTN, Airtel and other wallet providers.",
  },
  {
    value: "alipay",
    label: "Alipay",
    icon: <IconGlobe />,
    helper: "For payouts to Mainland China or Hong Kong.",
  },
  {
    value: "wechat_pay",
    label: "WeChat Pay (Weixin Pay)",
    icon: <IconGlobe />,
    helper: "For payouts to WeChat wallets.",
  },
  {
    value: "other_local",
    label: "Other payout method",
    icon: <IconWallet />,
    helper: "Cheque, local wallet or regional solution.",
  },
];

const DEFAULT_PAYOUT_CURRENCIES = ["USD", "EUR", "CNY", "UGX", "KES", "TZS", "RWF", "ZAR"];

const DEFAULT_PAYOUT_RHYTHMS: LabeledValueOption[] = [
  { value: "daily", label: "Daily", helper: "Payouts generated every business day." },
  { value: "weekly", label: "Weekly", helper: "Payouts grouped once per week." },
  { value: "monthly", label: "Monthly", helper: "Payouts grouped at month end." },
  {
    value: "on_threshold",
    label: "When balance reaches a threshold",
    helper: "We pay out once your balance reaches a minimum amount.",
  },
];

const PAYOUT_METHOD_LABELS = {
  bank_account: "Bank account",
  mobile_money: "Mobile money",
  alipay: "Alipay",
  wechat_pay: "WeChat Pay",
  other_local: "Other method",
};

const PAYOUT_METHOD_ICONS: Record<string, React.ReactNode> = {
  bank_account: <IconBank />,
  mobile_money: <IconWallet />,
  alipay: <IconGlobe />,
  wechat_pay: <IconGlobe />,
  other_local: <IconWallet />,
};

const LEGACY_PAYOUT_METHOD_MAP = {
  bank: "bank_account",
  mobile: "mobile_money",
  other: "other_local",
  wechat: "wechat_pay",
};

const DEFAULT_POLICY_PRESETS: PolicyPresetOption[] = [
  {
    id: "standard",
    label: "Standard",
    desc: "Balanced defaults for most sellers.",
    patch: {
      returnsDays: "7",
      warrantyDays: "90",
      handlingTimeDays: "2",
    },
  },
  {
    id: "fast",
    label: "Fast",
    desc: "Optimized for high conversion (quick dispatch).",
    patch: {
      returnsDays: "7",
      warrantyDays: "30",
      handlingTimeDays: "1",
    },
  },
  {
    id: "strict",
    label: "Strict",
    desc: "Lower returns risk (use carefully by category).",
    patch: {
      returnsDays: "3",
      warrantyDays: "0",
      handlingTimeDays: "3",
    },
  },
];

const DEFAULT_ONBOARDING_LOOKUPS: OnboardingLookups = {
  payoutMethods: DEFAULT_PAYOUT_METHODS,
  payoutCurrencies: DEFAULT_PAYOUT_CURRENCIES,
  payoutRhythms: DEFAULT_PAYOUT_RHYTHMS,
  mobileMoneyProviders: [
    { value: "MTN Mobile Money", label: "MTN Mobile Money" },
    { value: "Airtel Money", label: "Airtel Money" },
    { value: "M-Pesa", label: "M-Pesa" },
    { value: "Safaricom", label: "Safaricom" },
    { value: "Orange Money", label: "Orange Money" },
    { value: "Wave", label: "Wave" },
  ],
  mobileIdTypes: [
    { value: "national_id", label: "National ID" },
    { value: "passport", label: "Passport" },
    { value: "drivers_license", label: "Driver's License" },
    { value: "tax_id", label: "Tax ID" },
    { value: "residence_permit", label: "Residence Permit" },
    { value: "voter_id", label: "Voter ID" },
  ],
  payoutRegions: {
    alipay: [
      { value: "mainland", label: "Mainland China" },
      { value: "hong_kong", label: "Hong Kong SAR" },
      { value: "other", label: "Other region" },
    ],
    wechat: [
      { value: "mainland", label: "Mainland China" },
      { value: "hong_kong", label: "Hong Kong SAR" },
      { value: "other", label: "Other region" },
    ],
  },
  policyPresets: DEFAULT_POLICY_PRESETS,
};

function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function readStoredDraft(key) {
  if (typeof window === "undefined") return null;
  return safeJsonParse(window.localStorage.getItem(key));
}

function writeStoredDraft(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function clearStoredDraft(keys) {
  if (typeof window === "undefined") return;
  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  });
}

function draftMatchesActiveUser(draft, activeUserId) {
  if (!draft || typeof draft !== "object") return false;
  if (!activeUserId) return true;
  const owner = String(draft.owner || draft.email || "").toLowerCase();
  return !owner || owner === activeUserId;
}

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function kebab(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isEmail(v) {
  const s = String(v || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function sanitizeEmail(v) {
  const s = String(v || "").trim();
  return isEmail(s) ? s : undefined;
}

function isBackendUrl(v) {
  const s = String(v || "").trim();
  if (!s || s.startsWith("blob:")) return false;
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeBackendUrl(v) {
  const s = String(v || "").trim();
  return isBackendUrl(s) ? s : undefined;
}

function findTaxonomyPath(tree, id, path = []) {
  if (!id) return [];
  for (const node of tree || []) {
    const currentPath = [...path, node];
    if (node.id === id) return currentPath;
    if (Array.isArray(node.children) && node.children.length) {
      const childPath = findTaxonomyPath(node.children, id, currentPath);
      if (childPath.length) return childPath;
    }
  }
  return [];
}

function normalizeSelectionsAgainstTaxonomy(selections, taxonomyTree) {
  const rows = Array.isArray(selections) ? selections : [];
  if (!Array.isArray(taxonomyTree) || taxonomyTree.length === 0) return rows;

  return rows
    .map((entry, index) => {
      const nodeId = String(entry?.nodeId || "");
      if (!nodeId) return null;
      const pathNodes = findTaxonomyPath(taxonomyTree, nodeId);
      if (!pathNodes.length) return null;
      const normalizedPathNodes = pathNodes.map((node) => ({
        id: String(node.id),
        name: String(node.name),
        type: String(node.type),
      }));
      const marketplaceNode = normalizedPathNodes[0];
      return {
        id: entry?.id ? String(entry.id) : `${nodeId}-${index}`,
        nodeId,
        label: typeof entry?.label === "string" ? entry.label : normalizedPathNodes[normalizedPathNodes.length - 1]?.name,
        path: normalizedPathNodes.map((node) => node.name),
        pathNodes: normalizedPathNodes,
        marketplace: marketplaceNode?.name || "",
        marketplaceId: marketplaceNode?.id || "",
        slug: typeof entry?.slug === "string" ? entry.slug : undefined,
      };
    })
    .filter(Boolean);
}

function isExpired(expiry) {
  if (!expiry) return false;
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < now;
}

function isExpiringSoon(expiry, days = 30) {
  if (!expiry) return false;
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function splitPhoneNumber(value, defaultValueCode = DEFAULT_DIAL_CODE) {
  const raw = String(value || "").trim();
  if (!raw) return { code: defaultValueCode, number: "" };
  const match = COUNTRY_DIAL_CODES.find((item) => raw.startsWith(item.dial));
  if (match) {
    return { code: match.dial, number: raw.slice(match.dial.length).trim() };
  }
  return { code: defaultValueCode, number: raw };
}

function combinePhoneNumber(code, number) {
  const safeCode = String(code || "").trim() || DEFAULT_DIAL_CODE;
  const safeNumber = String(number || "").trim();
  return safeNumber ? `${safeCode} ${safeNumber}` : safeCode;
}

function hydratePayoutData(basePayout: PayoutForm, parsedPayout: Partial<PayoutForm> = {}) {
  const result: PayoutForm = { ...basePayout, ...parsedPayout };
  const normalizedMethod =
    LEGACY_PAYOUT_METHOD_MAP[result.method] || result.method || basePayout.method;
  result.method = normalizedMethod;

  result.otherProvider = result.otherProvider || result.otherDetails || "";
  result.otherNotes = result.otherNotes || result.otherDescription || "";
  result.mobileCountryCode = result.mobileCountryCode || "+256";
  result.rhythm = result.rhythm || "";
  result.thresholdAmount = String(result.thresholdAmount || "");

  result.alipayRegion = result.alipayRegion || "";
  result.alipayLogin = result.alipayLogin || "";
  result.wechatRegion = result.wechatRegion || "";
  result.wechatId = result.wechatId || "";

  result.bankCountry = result.bankCountry || "";
  result.bankBranch = result.bankBranch || "";
  result.swiftBic = result.swiftBic || "";
  result.iban = result.iban || "";

  result.mobileIdType = result.mobileIdType || "";
  result.mobileIdNumber = result.mobileIdNumber || "";

  result.otherCountry = result.otherCountry || "";
  result.confirmDetails = result.confirmDetails ?? false;
  result.currency = result.currency || "";

  result.notificationsEmail = result.notificationsEmail || "";
  result.notificationsWhatsApp = result.notificationsWhatsApp || "";

  return result;
}

function buildPolicyPreview({
  storeName,
  policies,
  shipping,
}: {
  storeName: string;
  policies?: PoliciesForm;
  shipping?: ShippingForm;
}) {
  const name = storeName || "Your Store";
  const returns = policies?.returnsDays;
  const warranty = policies?.warrantyDays;
  const handling = shipping?.handlingTimeDays;

  const parts: string[] = [];
  if (returns !== "" && returns != null) {
    const v = String(returns);
    parts.push(
      `${name} accepts returns within ${v} day(s) after delivery (subject to item condition and category rules).`
    );
  }
  if (warranty !== "" && warranty != null) {
    const v = String(warranty);
    parts.push(
      v === "0"
        ? `${name} does not provide warranty by default. Warranty may apply where legally required or by manufacturer terms.`
        : `${name} provides a warranty period of ${v} day(s) where applicable.`
    );
  }
  if (handling !== "" && handling != null) {
    parts.push(`${name} dispatches orders within ${handling} business day(s) in most cases.`);
  }

  return parts.length
    ? parts.join(" ")
    : "Set your returns, warranty and handling time to preview your store policy summary.";
}

const Req = ({ ok }) => {
  const { t } = useLocalization();
  return (
    <span
      className={`ml-2 rounded-full px-1.5 py-[1px] text-[10px] font-bold ${ok ? "bg-[#e8fff7] text-[var(--ev-green)]" : "bg-red-50 text-red-600"
        }`}
    >
      {ok ? t("OK") : t("REQ")}
    </span>
  );
};

function StatusChip({ s }) {
  const { t } = useLocalization();
  const map = {
    DRAFT: t("Draft"),
    SUBMITTED: t("Submitted"),
    APPROVED: t("Approved"),
    REJECTED: t("Rejected"),
  };
  const label = map[s] || s || "N/A";
  const cls =
    s === "APPROVED"
      ? "chip chip-ok"
      : s === "SUBMITTED"
        ? "chip chip-info"
        : s === "REJECTED"
          ? "chip chip-bad"
          : "chip chip-neutral";
  return <span className={cls}>{label}</span>;
}

function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;
  const tone = toast.tone || "info";
  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      <div className="toast-title">
        <span className="toast-icon" aria-hidden>
          {tone === "success" ? "✅" : tone === "error" ? "⚠️" : "ℹ️"}
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
  lastSaved: string;
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
            {t("Autosaved at")} {lastSaved || "N/A"}
          </div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
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
          {required ? (
            <span className="ml-1 text-red-600 font-bold">*</span>
          ) : null}
        </div>
        {error ? <span className="text-[11px] font-bold text-red-600">{error}</span> : null}
      </div>
      {children}
      {helper ? <div className="text-[11px] text-[var(--ev-muted)]">{helper}</div> : null}
    </div>
  );
}

function CountryCodeSelect({
  value,
  onChange,
  disabled,
  selectClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  selectClassName?: string;
}) {
  const { t } = useLocalization();
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_DIAL_OPTIONS;
    return COUNTRY_DIAL_OPTIONS.filter((option) => option.search.includes(q));
  }, [query]);

  return (
    <div className="flex flex-col gap-1">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input w-full"
        disabled={disabled}
        placeholder={t("Search country or code")}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName || "input w-full"}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CountryCodeAutocomplete({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useLocalization();
  const selected = COUNTRY_DIAL_OPTIONS.find((option) => option.value === value);

  return (
    <Autocomplete
      options={COUNTRY_DIAL_OPTIONS}
      value={selected ?? undefined}
      onChange={(_, option) => onChange(option?.value || "")}
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
        <TextField {...params} label={label || t("Country code")} size="small" fullWidth />
      )}
    />
  );
}

function ChipButton({ active, children, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`chipbtn ${active ? "chipbtn-on" : "chipbtn-off"} ${disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}

const DEFAULT_REVIEW_STATE = {
  submittedAt: null,
  inReviewAt: null,
  approvedAt: null,
  slaHours: 48,
};

function toUiOnboardingStatus(value: unknown) {
  const normalized = String(value || "").toLowerCase();
  return normalized === "submitted" || normalized === "resubmitted" || normalized === "approved"
    ? "SUBMITTED"
    : "DRAFT";
}

function toWorkflowOnboardingStatus(value: unknown) {
  const normalized = String(value || "").toLowerCase();
  return normalized === "submitted" || normalized === "resubmitted" ? "submitted" : "draft";
}

function compactValue<T>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return (trimmed ? trimmed : undefined) as T | undefined;
  }
  if (Array.isArray(value)) {
    const next = value
      .map((entry) => compactValue(entry))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
    return (next.length ? next : undefined) as T | undefined;
  }
  if (typeof value === "object") {
    const next = Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, compactValue(entry)])
        .filter(([, entry]) => entry !== undefined)
    );
    return (Object.keys(next).length ? next : undefined) as T | undefined;
  }
  return value;
}

function parseOptionalInt(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalNumber(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOnboardingDocsPayload(docs: DocItem[]) {
  return {
    list: docs.map((doc) => ({
      id: doc.id,
      type: doc.type,
      name: doc.name,
      file: doc.file,
      fileUrl: sanitizeBackendUrl(doc.fileUrl),
      status: doc.status,
      expiry: doc.expiry,
      uploadedAt: doc.uploadedAt,
      notes: doc.notes,
    })),
  };
}

function toOnboardingPayload(form: SellerForm, taxonomyTree = []) {
  const normalizedTaxonomySelections = normalizeSelectionsAgainstTaxonomy(
    form.taxonomySelections,
    taxonomyTree
  );
  const normalizedTaxonomySelection =
    form.taxonomySelection?.nodeId && Array.isArray(taxonomyTree) && taxonomyTree.length > 0
      ? normalizeSelectionsAgainstTaxonomy([form.taxonomySelection], taxonomyTree)[0]
      : form.taxonomySelection;

  return compactValue({
    owner: form.owner,
    profileType: "SELLER",
    status: toWorkflowOnboardingStatus(form.status),
    storeName: form.storeName,
    storeSlug: form.storeSlug,
    email: sanitizeEmail(form.email),
    phone: form.phone,
    website: sanitizeBackendUrl(form.website),
    about: form.about,
    brandColor: form.brandColor,
    logoUrl: sanitizeBackendUrl(form.logoUrl),
    coverUrl: sanitizeBackendUrl(form.coverUrl),
    support: {
      whatsapp: form.support.whatsapp,
      email: sanitizeEmail(form.support.email),
      phone: form.support.phone,
    },
    shipFrom: {
      country: form.shipFrom.country,
      province: form.shipFrom.province,
      city: form.shipFrom.city,
      address1: form.shipFrom.address1,
      address2: form.shipFrom.address2,
      postalCode: form.shipFrom.postalCode,
    },
    channels: form.channels,
    languages: form.languages,
    taxonomySelection: normalizedTaxonomySelection?.nodeId
      ? {
          nodeId: normalizedTaxonomySelection.nodeId,
          label:
            typeof normalizedTaxonomySelection.label === "string"
              ? normalizedTaxonomySelection.label
              : undefined,
          path: Array.isArray(normalizedTaxonomySelection.path)
            ? normalizedTaxonomySelection.path.map(String)
            : undefined,
          slug:
            typeof normalizedTaxonomySelection.slug === "string"
              ? normalizedTaxonomySelection.slug
              : undefined,
          pathNodes: Array.isArray(normalizedTaxonomySelection.pathNodes)
            ? normalizedTaxonomySelection.pathNodes
                .filter((entry) => entry?.id && entry?.name && entry?.type)
                .map((entry) => ({ id: String(entry.id), name: String(entry.name), type: String(entry.type) }))
            : undefined,
        }
      : undefined,
    taxonomySelections: Array.isArray(normalizedTaxonomySelections)
      ? normalizedTaxonomySelections
          .filter((entry) => entry?.nodeId)
          .map((entry) => ({
            nodeId: String(entry.nodeId),
            label: typeof entry.label === "string" ? entry.label : undefined,
            path: Array.isArray(entry.path) ? entry.path.map(String) : undefined,
            slug: typeof entry.slug === "string" ? entry.slug : undefined,
            pathNodes: Array.isArray(entry.pathNodes)
              ? entry.pathNodes
                  .filter((node) => node?.id && node?.name && node?.type)
                  .map((node) => ({ id: String(node.id), name: String(node.name), type: String(node.type) }))
              : undefined,
          }))
      : undefined,
    docs: toOnboardingDocsPayload(form.docs.list),
    shipping: {
      profileId: form.shipping.profileId,
      expressReady: form.shipping.expressReady,
      handlingTimeDays: parseOptionalInt(form.shipping.handlingTimeDays),
    },
    policies: {
      returnsDays: parseOptionalInt(form.policies.returnsDays),
      warrantyDays: parseOptionalInt(form.policies.warrantyDays),
      termsUrl: sanitizeBackendUrl(form.policies.termsUrl),
      privacyUrl: sanitizeBackendUrl(form.policies.privacyUrl),
      policyNotes: form.policies.policyNotes,
    },
    payout: {
      method: form.payout.method,
      currency: form.payout.currency,
      rhythm: form.payout.rhythm,
      thresholdAmount: parseOptionalNumber(form.payout.thresholdAmount),
      bankName: form.payout.bankName,
      bankCountry: form.payout.bankCountry,
      bankBranch: form.payout.bankBranch,
      accountName: form.payout.accountName,
      accountNo: form.payout.accountNo,
      swiftBic: form.payout.swiftBic,
      iban: form.payout.iban,
      mobileProvider: form.payout.mobileProvider,
      mobileCountryCode: form.payout.mobileCountryCode,
      mobileNo: form.payout.mobileNo,
      mobileIdType: form.payout.mobileIdType,
      mobileIdNumber: form.payout.mobileIdNumber,
      alipayRegion: form.payout.alipayRegion,
      alipayLogin: form.payout.alipayLogin,
      wechatRegion: form.payout.wechatRegion,
      wechatId: form.payout.wechatId,
      otherMethod: form.payout.otherMethod,
      otherProvider: form.payout.otherProvider,
      otherCountry: form.payout.otherCountry,
      otherNotes: form.payout.otherNotes,
      notificationsEmail: sanitizeEmail(form.payout.notificationsEmail),
      notificationsWhatsApp: form.payout.notificationsWhatsApp,
      confirmDetails: form.payout.confirmDetails,
      otherDetails: form.payout.otherDetails,
      otherDescription: form.payout.otherDescription,
    },
    tax: {
      taxpayerType: form.tax.taxpayerType,
      legalName: form.tax.legalName,
      taxCountry: form.tax.taxCountry,
      taxId: form.tax.taxId,
      vatNumber: form.tax.vatNumber,
      legalAddress: form.tax.legalAddress,
      contact: form.tax.contact,
      contactEmail: sanitizeEmail(form.tax.contactEmail),
      contactSameAsOwner: form.tax.contactSameAsOwner,
    },
    acceptance: {
      sellerTerms: form.acceptance.sellerTerms,
      contentPolicy: form.acceptance.contentPolicy,
      dataProcessing: form.acceptance.dataProcessing,
    },
  }) ?? {};
}

function normalizeSellerFormPayload(
  payload: Record<string, unknown> | null | undefined,
  base: SellerForm,
  activeUserId: string
): SellerForm {
  const parsed = payload && typeof payload === "object" ? (payload as Partial<SellerForm>) : null;
  if (!parsed) return base;

  const owner = String(parsed.owner || parsed.email || "").toLowerCase();
  if (activeUserId && owner && owner !== activeUserId) {
    return base;
  }

  const merged = {
    ...base,
    ...parsed,
    owner: activeUserId || owner || base.owner,
    status: toUiOnboardingStatus(parsed.status),
    shipFrom: { ...base.shipFrom, ...(parsed.shipFrom || {}) },
    support: { ...base.support, ...(parsed.support || {}) },
    shipping: {
      ...base.shipping,
      ...(parsed.shipping || {}),
      handlingTimeDays:
        parsed.shipping && parsed.shipping.handlingTimeDays != null
          ? String(parsed.shipping.handlingTimeDays)
          : base.shipping.handlingTimeDays,
    },
    policies: {
      ...base.policies,
      ...(parsed.policies || {}),
      returnsDays:
        parsed.policies && parsed.policies.returnsDays != null
          ? String(parsed.policies.returnsDays)
          : base.policies.returnsDays,
      warrantyDays:
        parsed.policies && parsed.policies.warrantyDays != null
          ? String(parsed.policies.warrantyDays)
          : base.policies.warrantyDays,
    },
    docs: { list: Array.isArray(parsed?.docs?.list) ? parsed.docs.list : base.docs.list },
    payout: hydratePayoutData(base.payout, parsed.payout || {}),
    tax: { ...base.tax, ...(parsed.tax || {}) },
    acceptance: { ...base.acceptance, ...(parsed.acceptance || {}) },
  } satisfies SellerForm;

  if (
    merged.taxonomySelection?.nodeId &&
    (!Array.isArray(merged.taxonomySelections) || merged.taxonomySelections.length === 0)
  ) {
    merged.taxonomySelections = [merged.taxonomySelection];
  }

  if (!Array.isArray(merged.channels)) {
    merged.channels = [];
  }
  if (!Array.isArray(merged.languages)) {
    merged.languages = [];
  }

  return merged;
}

function normalizeScreenUi(payload: Record<string, unknown> | null | undefined) {
  const screen = payload && typeof payload === "object" ? payload : {};
  const ui = screen && typeof screen.ui === "object" ? (screen.ui as Record<string, unknown>) : {};
  const review =
    screen && typeof screen.review === "object"
      ? (screen.review as Record<string, unknown>)
      : DEFAULT_REVIEW_STATE;

  return {
    ui: {
      theme: String(ui.theme || "light"),
      step: Number(ui.step || 1) || 1,
      compactAside: Boolean(ui.compactAside),
    },
    review: {
      ...DEFAULT_REVIEW_STATE,
      ...(review || {}),
    },
  };
}

function normalizeShippingProfiles(payload: Record<string, unknown> | null | undefined): ShippingProfile[] {
  const rows =
    payload && typeof payload === "object" && Array.isArray((payload as { profiles?: unknown[] }).profiles)
      ? ((payload as { profiles?: Array<Record<string, unknown>> }).profiles ?? [])
      : [];

  return rows.map((entry) => ({
    id: String(entry.id || ""),
    name: String(entry.name || "Shipping Profile"),
    isDefault: Boolean(entry.isDefault),
    archived: String(entry.status || "").toUpperCase() === "ARCHIVED",
  }));
}

function normalizeLabeledValueOptions(
  value: unknown,
  defaultValue: LabeledValueOption[]
): LabeledValueOption[] {
  if (!Array.isArray(value)) return defaultValue;
  const rows = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const optionValue = String(item.value || "").trim();
      const label = String(item.label || optionValue || "").trim();
      if (!optionValue || !label) return null;
      return {
        value: optionValue,
        label,
        helper: item.helper ? String(item.helper) : undefined,
      };
    })
    .filter((entry): entry is LabeledValueOption => Boolean(entry));
  return rows.length ? rows : defaultValue;
}

function normalizeStringOptions(value: unknown, defaultValue: string[]): string[] {
  if (!Array.isArray(value)) return defaultValue;
  const rows = value
    .map((entry) => String(entry || "").trim().toUpperCase())
    .filter(Boolean);
  return rows.length ? rows : defaultValue;
}

function normalizePolicyPresets(value: unknown, defaultValue: PolicyPresetOption[]): PolicyPresetOption[] {
  if (!Array.isArray(value)) return defaultValue;
  const rows = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const patch =
        item.patch && typeof item.patch === "object" && !Array.isArray(item.patch)
          ? (item.patch as Record<string, unknown>)
          : {};
      const id = String(item.id || "").trim();
      const label = String(item.label || id || "").trim();
      if (!id || !label) return null;
      return {
        id,
        label,
        desc: String(item.desc || "").trim(),
        patch: {
          returnsDays: String(patch.returnsDays || ""),
          warrantyDays: String(patch.warrantyDays || ""),
          handlingTimeDays: String(patch.handlingTimeDays || ""),
        },
      };
    })
    .filter((entry): entry is PolicyPresetOption => Boolean(entry));
  return rows.length ? rows : defaultValue;
}

function normalizeOnboardingLookups(payload: Record<string, unknown> | null | undefined): OnboardingLookups {
  const source = payload && typeof payload === "object" ? payload : {};
  const payoutRegions =
    source.payoutRegions && typeof source.payoutRegions === "object" && !Array.isArray(source.payoutRegions)
      ? (source.payoutRegions as Record<string, unknown>)
      : {};

  return {
    payoutMethods: normalizeLabeledValueOptions(source.payoutMethods, DEFAULT_ONBOARDING_LOOKUPS.payoutMethods),
    payoutCurrencies: normalizeStringOptions(source.payoutCurrencies, DEFAULT_ONBOARDING_LOOKUPS.payoutCurrencies),
    payoutRhythms: normalizeLabeledValueOptions(source.payoutRhythms, DEFAULT_ONBOARDING_LOOKUPS.payoutRhythms),
    mobileMoneyProviders: normalizeLabeledValueOptions(
      source.mobileMoneyProviders,
      DEFAULT_ONBOARDING_LOOKUPS.mobileMoneyProviders
    ),
    mobileIdTypes: normalizeLabeledValueOptions(source.mobileIdTypes, DEFAULT_ONBOARDING_LOOKUPS.mobileIdTypes),
    payoutRegions: {
      alipay: normalizeLabeledValueOptions(
        payoutRegions.alipay,
        DEFAULT_ONBOARDING_LOOKUPS.payoutRegions.alipay
      ),
      wechat: normalizeLabeledValueOptions(
        payoutRegions.wechat,
        DEFAULT_ONBOARDING_LOOKUPS.payoutRegions.wechat
      ),
    },
    policyPresets: normalizePolicyPresets(source.policyPresets, DEFAULT_ONBOARDING_LOOKUPS.policyPresets),
  };
}

export default function SellerOnboardingProV4_JS() {
  const { t, language, setLanguage } = useLocalization();
  const { resolvedMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionUser = useSession();
  const sellerTaxonomyQuery = useSellerTaxonomy();
  const sellerTaxonomy = sellerTaxonomyQuery.taxonomy;

  const [ui, setUi] = useState(() => ({
    theme: "light",
    step: 1,
    compactAside: false,
  }));

  const activeUserId = useMemo(() => {
    const val = sessionUser?.userId || sessionUser?.email || sessionUser?.phone || "";
    return String(val || "").toLowerCase();
  }, [sessionUser]);

  const createEmptyForm = useCallback(
    (): SellerForm => ({
      owner: activeUserId,
      status: "DRAFT",

      // Step 1: Store Profile
      storeName: "",
      storeSlug: "",
      email: "",
      phone: "",
      website: "",
      about: "",
      brandColor: BRAND.green,
      logoUrl: "",
      coverUrl: "",
      support: {
        whatsapp: "",
        email: "",
        phone: "",
      },
      shipFrom: {
        country: "",
        province: "",
        city: "",
        address1: "",
        address2: "",
        postalCode: "",
      },

      // Step 2: Catalog & Channels
      channels: [],
      languages: [],
      taxonomySelection: null, // legacy single
      taxonomySelections: [], // multi

      // Step 3: Compliance & Docs
      docs: { list: [] },

      // Step 4: Shipping & Policies
      shipping: {
        profileId: "",
        expressReady: false,
        handlingTimeDays: "",
      },
      policies: {
        returnsDays: "",
        warrantyDays: "",
        termsUrl: "",
        privacyUrl: "",
        policyNotes: "",
      },

      // Step 5: Payout & Tax
      payout: {
        method: "bank_account",
        currency: "",
        rhythm: "",
        thresholdAmount: "",

        bankName: "",
        bankCountry: "",
        bankBranch: "",
        accountName: "",
        accountNo: "",
        swiftBic: "",
        iban: "",

        mobileProvider: "",
        mobileCountryCode: "+256",
        mobileNo: "",
        mobileIdType: "",
        mobileIdNumber: "",

        alipayRegion: "",
        alipayLogin: "",

        wechatRegion: "",
        wechatId: "",

        otherMethod: "",
        otherProvider: "",
        otherCountry: "",
        otherNotes: "",

        notificationsEmail: "",
        notificationsWhatsApp: "",

        confirmDetails: false,
      },
      tax: {
        taxpayerType: "business",
        legalName: "",
        taxCountry: "",
        taxId: "",
        vatNumber: "",
        legalAddress: "",
        contact: "",
        contactEmail: "",
        contactSameAsOwner: false,
      },

      // Step 6: Legal
      acceptance: {
        sellerTerms: false,
        contentPolicy: false,
        dataProcessing: false,
      },
    }),
    [activeUserId]
  );

  const [form, setForm] = useState<SellerForm>(() => createEmptyForm());
  const [lastSaved, setLastSaved] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const saveReadyRef = useRef(false);

  const setF = (
    patch: Partial<SellerForm> | ((prev: SellerForm) => Partial<SellerForm> | null)
  ) =>
    setForm((prev) => {
      const nextPatch = typeof patch === "function" ? patch(prev) : patch;
      if (!nextPatch) return prev;
      const nextState = { ...prev, ...nextPatch };
      const changed = Object.keys(nextPatch).some((k) => nextPatch[k] !== prev[k]);
      return changed ? nextState : prev;
    });

  // Keep the current onboarding screen as the single source of truth.
  useEffect(() => {
    if (form.status === "SUBMITTED" && location.pathname === "/seller/onboarding") {
      navigate("/seller/onboarding", { replace: true });
    }
  }, [form.status, navigate, location.pathname]);

  const [review, setReview] = useState(DEFAULT_REVIEW_STATE);

  // Step
  const step = clamp(ui.step || 1, 1, 6);
  const setStep = (n) => setUi((p) => ({ ...p, step: clamp(Number(n) || 1, 1, 6) }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const isLocked = form.status !== "DRAFT";

  // Owner contact convenience
  const ownerContactName = useMemo(
    () =>
      sessionUser?.name ||
      sessionUser?.fullName ||
      sessionUser?.displayName ||
      sessionUser?.userId ||
      sessionUser?.email ||
      sessionUser?.phone ||
      form.storeName ||
      "",
    [sessionUser, form.storeName]
  );
  const ownerContactEmail = useMemo(
    () => sessionUser?.email || form.email || sessionUser?.userId || sessionUser?.phone || "",
    [sessionUser, form.email]
  );

  // Keep contact in sync when requested
  useEffect(() => {
    if (!form.tax?.contactSameAsOwner) return;
    const desiredContact = ownerContactName;
    const desiredEmail = ownerContactEmail;
    if (form.tax.contact === desiredContact && form.tax.contactEmail === desiredEmail) return;
    setF((prev) => ({
      tax: { ...prev.tax, contact: desiredContact, contactEmail: desiredEmail },
    }));
  }, [
    form.tax?.contactSameAsOwner,
    ownerContactName,
    ownerContactEmail,
    form.tax.contact,
    form.tax.contactEmail,
  ]);

  // Image pickers (logo + cover)
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const replaceBlobUrl = (oldUrl, nextUrl) => {
    if (oldUrl && typeof oldUrl === "string" && oldUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {
        // ignore
      }
    }
    return nextUrl;
  };

  const handleImagePick = useCallback(
    (field, file) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      setF((prev) => {
        if (field === "logoUrl") return { logoUrl: replaceBlobUrl(prev.logoUrl, url) };
        if (field === "coverUrl") return { coverUrl: replaceBlobUrl(prev.coverUrl, url) };
        return null;
      });
    },
    [setF]
  );

  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [lookups, setLookups] = useState<OnboardingLookups>(DEFAULT_ONBOARDING_LOOKUPS);
  const payoutMethodLabels = useMemo(
    () =>
      lookups.payoutMethods.reduce<Record<string, string>>((acc, method) => {
        acc[method.value] = method.label;
        return acc;
      }, { ...PAYOUT_METHOD_LABELS }),
    [lookups.payoutMethods]
  );
  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;

    const hydrate = async () => {
      try {
        const storedForm = readStoredDraft(STORAGE.form);
        const storedUi = readStoredDraft(STORAGE.ui);
        const storedReview = readStoredDraft(STORAGE.review);
        const [
          onboardingResult,
          lookupsResult,
          screenStateResult,
          shippingResult,
          accountApprovalResult,
        ] = await Promise.allSettled([
          sellerBackendApi.getOnboarding(),
          sellerBackendApi.getOnboardingLookups(),
          sellerBackendApi.getWorkflowScreenState("seller-onboarding"),
          sellerBackendApi.getShippingProfiles(),
          sellerBackendApi.getAccountApproval(),
        ]);

        if (cancelled) return;
        const onboarding = onboardingResult.status === "fulfilled" ? onboardingResult.value : null;
        const lookupPayload = lookupsResult.status === "fulfilled" ? lookupsResult.value : null;
        const screenState = screenStateResult.status === "fulfilled" ? screenStateResult.value : null;
        const shippingPayload = shippingResult.status === "fulfilled" ? shippingResult.value : null;
        const accountApproval =
          accountApprovalResult.status === "fulfilled" ? accountApprovalResult.value : null;

        const base = createEmptyForm();
        const normalizedForm = normalizeSellerFormPayload(
          onboarding as Record<string, unknown> | null,
          base,
          activeUserId
        );
        const normalizedLookups = normalizeOnboardingLookups(
          lookupPayload as Record<string, unknown> | null
        );
        const normalizedScreen = normalizeScreenUi(screenState as Record<string, unknown> | null);
        const normalizedStoredScreen = normalizeScreenUi({
          ui: storedUi && typeof storedUi === "object" ? storedUi : {},
          review: storedReview && typeof storedReview === "object" ? storedReview : {},
        });
        const approvalPayload =
          accountApproval && typeof accountApproval === "object"
            ? (accountApproval as Record<string, unknown>)
            : null;
        if (
          String(approvalPayload?.status || "").toLowerCase() === "approved" &&
          !normalizedScreen.review.approvedAt
        ) {
          normalizedScreen.review = {
            ...normalizedScreen.review,
            inReviewAt: null,
            approvedAt:
              String(approvalPayload?.approvedAt || approvalPayload?.submittedAt || normalizedForm.updatedAt || "") || null,
          };
        }
        const nextProfiles = normalizeShippingProfiles(
          shippingPayload as Record<string, unknown> | null
        ).filter((profile) => !profile.archived);
        const resolvedForm = draftMatchesActiveUser(storedForm, activeUserId)
          ? normalizeSellerFormPayload(
              storedForm as Record<string, unknown>,
              normalizedForm,
              activeUserId
            )
          : normalizedForm;
        const resolvedUi =
          storedUi && typeof storedUi === "object"
            ? { ...normalizedScreen.ui, ...normalizedStoredScreen.ui, step: 1 }
            : { ...normalizedScreen.ui, step: 1 };
        const resolvedReview =
          storedReview && typeof storedReview === "object"
            ? { ...normalizedScreen.review, ...normalizedStoredScreen.review }
            : normalizedScreen.review;
        if (
          String(approvalPayload?.status || "").toLowerCase() === "approved" &&
          !resolvedReview.approvedAt
        ) {
          resolvedReview.inReviewAt = null;
          resolvedReview.approvedAt =
            String(
              approvalPayload?.approvedAt ||
                approvalPayload?.submittedAt ||
                resolvedForm.updatedAt ||
                ""
            ) || null;
        }

        setForm(resolvedForm);
        setLookups(normalizedLookups);
        setUi(resolvedUi);
        setReview(resolvedReview);
        setProfiles(nextProfiles);
      } catch {
        if (!cancelled) {
          setToast({
            tone: "error",
            title: "Backend sync failed",
            message: "We could not load your onboarding draft from the backend.",
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
  }, [activeUserId, createEmptyForm, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredDraft(STORAGE.form, form);
    writeStoredDraft(STORAGE.ui, ui);
    writeStoredDraft(STORAGE.review, review);
  }, [form, hydrated, review, ui]);

  useEffect(() => {
    if (!hydrated || !saveReadyRef.current) return;
    const timeoutId = window.setTimeout(() => {
      void sellerBackendApi
        .patchOnboarding(toOnboardingPayload(form, sellerTaxonomy))
        .then(() => setLastSaved(ts()))
        .catch(() => {
          setToast({
            tone: "error",
            title: "Autosave failed",
            message: "Changes are not syncing to the backend right now.",
          });
        });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [form, hydrated, sellerTaxonomy]);

  useEffect(() => {
    if (!hydrated || !sellerTaxonomy.length) return;
    setF((prev) => {
      const normalizedSelections = normalizeSelectionsAgainstTaxonomy(prev.taxonomySelections, sellerTaxonomy);
      const normalizedCurrent = prev.taxonomySelection?.nodeId
        ? normalizeSelectionsAgainstTaxonomy([prev.taxonomySelection], sellerTaxonomy)[0] || null
        : null;
      const nextCurrent =
        normalizedCurrent ||
        normalizedSelections.find((entry) => entry.nodeId === prev.taxonomySelection?.nodeId) ||
        normalizedSelections[normalizedSelections.length - 1] ||
        null;

      const sameSelections =
        JSON.stringify(normalizedSelections) === JSON.stringify(prev.taxonomySelections || []);
      const sameCurrent =
        JSON.stringify(nextCurrent) === JSON.stringify(prev.taxonomySelection || null);

      if (sameSelections && sameCurrent) return null;

      return {
        taxonomySelections: normalizedSelections,
        taxonomySelection: nextCurrent,
      };
    });
  }, [hydrated, sellerTaxonomy]);

  useEffect(() => {
    if (!hydrated || !saveReadyRef.current) return;
    const timeoutId = window.setTimeout(() => {
      void sellerBackendApi.patchWorkflowScreenState("seller-onboarding", {
        ui,
        review,
      }).catch(() => {
        setToast({
          tone: "error",
          title: "State sync failed",
          message: "Onboarding review state could not be saved to the backend.",
        });
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [hydrated, review, ui]);

  // Slug validation + availability
  const [slugState, setSlugState] = useState({ status: "idle", message: "" });
  useEffect(() => {
    const slug = String(form.storeSlug || "").trim();
    if (!slug) {
      setSlugState({ status: "idle", message: "" });
      return;
    }

    const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 40;
    if (!valid) {
      setSlugState({ status: "invalid", message: "Use 3 to 40 characters, letters/numbers, and hyphens." });
      return;
    }

    if (RESERVED_SLUGS.includes(slug)) {
      setSlugState({ status: "taken", message: "This handle is reserved." });
      return;
    }

    let cancelled = false;
    setSlugState({ status: "checking", message: "Checking availability..." });
    const id = window.setTimeout(() => {
      void sellerBackendApi
        .getSlugAvailability(slug)
        .then((result) => {
          if (cancelled) return;
          if (result?.available) {
            setSlugState({ status: "ok", message: "Available." });
            return;
          }
          if (result?.reason === "reserved") {
            setSlugState({ status: "taken", message: "This handle is reserved." });
            return;
          }
          if (result?.reason === "taken") {
            setSlugState({ status: "taken", message: "This handle is already taken." });
            return;
          }
          setSlugState({ status: "invalid", message: "This handle is invalid." });
        })
        .catch(() => {
          if (!cancelled) {
            setSlugState({ status: "invalid", message: "Could not verify this handle right now." });
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [form.storeSlug]);

  // Required docs
  const requiredDocTypes = REQUIRED_DOC_TYPES;

  const docsStats = useMemo(() => {
    const list = Array.isArray(form.docs?.list) ? form.docs.list : [];

    const byType = (type) => list.filter((d) => String(d?.type || "").trim() === type);

    const reqRows = requiredDocTypes.map((type) => {
      const matches = byType(type);
      const hasValid = matches.some((d) => !isExpired(d?.expiry));
      const expSoon = matches.some((d) => isExpiringSoon(d?.expiry, 30));
      const hasExpired = matches.some((d) => isExpired(d?.expiry));
      return {
        type,
        count: matches.length,
        ok: hasValid,
        expSoon,
        hasExpired,
      };
    });

    const missing = reqRows.filter((r) => !r.ok);

    return {
      reqRows,
      missing,
      allOk: missing.length === 0,
      total: list.length,
    };
  }, [form.docs?.list, requiredDocTypes]);

  const docTypeRows = useMemo(() => {
    const list = Array.isArray(form.docs?.list) ? form.docs.list : [];
    const rows = DOC_TYPES.map((type) => {
      const matches = list.filter((d) => String(d?.type || "").trim() === type);
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
  }, [form.docs?.list, requiredDocTypes]);

  const hasMissingRequiredDocs = useMemo(
    () => docTypeRows.some((r) => r.required && !r.ok),
    [docTypeRows]
  );

  // Validations
  const storeErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!String(form.storeName || "").trim()) e.storeName = t("Required");
    if (!String(form.storeSlug || "").trim()) e.storeSlug = t("Required");
    if (form.storeSlug && slugState.status === "invalid") e.storeSlug = t("Invalid");
    if (form.storeSlug && slugState.status === "taken") e.storeSlug = t("Taken");
    if (!String(form.email || "").trim()) e.email = t("Required");
    else if (!isEmail(form.email)) e.email = t("Invalid");
    return e;
  }, [form.storeName, form.storeSlug, form.email, slugState.status, t]);

  const shippingErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!String(form.shipping?.profileId || "").trim()) e.profileId = t("Required");
    if (String(form.shipping?.handlingTimeDays ?? "").trim() === "") e.handlingTimeDays = t("Required");
    if (String(form.policies?.returnsDays ?? "").trim() === "") e.returnsDays = t("Required");
    return e;
  }, [form.shipping?.profileId, form.shipping?.handlingTimeDays, form.policies?.returnsDays, t]);

  const catalogOk = useMemo(() => {
    const selections = Array.isArray(form.taxonomySelections) ? form.taxonomySelections : [];
    const hasSelections = selections.length > 0;
    const allSub = selections.every((line) => {
      const lastNode = line?.pathNodes?.[line.pathNodes.length - 1];
      return lastNode?.type === "Sub-Category";
    });

    const channelsOk = Array.isArray(form.channels) && form.channels.length > 0;

    return hasSelections && allSub && channelsOk;
  }, [form.taxonomySelections, form.channels]);

  const catalogErrors = useMemo(() => {
    const selections = Array.isArray(form.taxonomySelections) ? form.taxonomySelections : [];
    const hasSelections = selections.length > 0;
    const allSub = selections.every((line) => {
      const lastNode = line?.pathNodes?.[line.pathNodes.length - 1];
      return lastNode?.type === "Sub-Category";
    });
    const channelsOk = Array.isArray(form.channels) && form.channels.length > 0;
    return {
      selections: !hasSelections || !allSub ? t("Select at least one sub-category") : "",
      channels: !channelsOk ? t("Select at least one channel") : "",
    };
  }, [form.taxonomySelections, form.channels, t]);

  const shippingOk = useMemo(() => {
    const hasProfile = !!String(form.shipping?.profileId || "").trim();
    const returnsSet = String(form.policies?.returnsDays ?? "").trim() !== "";
    const handlingSet = String(form.shipping?.handlingTimeDays ?? "").trim() !== "";
    return hasProfile && returnsSet && handlingSet;
  }, [form.shipping?.profileId, form.shipping?.handlingTimeDays, form.policies?.returnsDays]);

  function payoutUsesAccount(method) {
    return ["bank_account", "alipay", "wechat_pay"].includes(method);
  }

  function payoutUsesMobile(method) {
    return method === "mobile_money";
  }

  const payoutOk = useMemo(() => {
    const p = form.payout || {};
    const baseOk = p.currency && p.confirmDetails;
    if (!baseOk) return false;

    if (p.method === "bank_account") {
      return (
        !!String(p.bankName || "").trim() &&
        !!String(p.accountName || "").trim() &&
        !!String(p.accountNo || "").trim()
      );
    }

    if (p.method === "mobile_money") {
      return (
        !!String(p.mobileProvider || "").trim() &&
        !!String(p.mobileNo || "").trim() &&
        !!String(p.accountName || "").trim()
      );
    }

    if (p.method === "alipay") {
      return !!String(p.accountName || "").trim() && !!String(p.alipayLogin || "").trim();
    }

    if (p.method === "wechat_pay") {
      return (
        !!String(p.accountName || "").trim() &&
        !!String(p.wechatId || "").trim() &&
        !!String(p.accountNo || "").trim()
      );
    }

    return !!String(p.otherMethod || "").trim() && !!String(p.otherProvider || "").trim();
  }, [form.payout]);

  const payoutErrors = useMemo<Record<string, string>>(() => {
    const p = form.payout || ({} as PayoutForm);
    const e: Record<string, string> = {};
    if (!String(p.currency || "").trim()) e.currency = t("Required");
    if (!p.confirmDetails) e.confirmDetails = t("Required");

    if (p.method === "bank_account") {
      if (!String(p.bankName || "").trim()) e.bankName = t("Required");
      if (!String(p.accountName || "").trim()) e.accountName = t("Required");
      if (!String(p.accountNo || "").trim()) e.accountNo = t("Required");
    } else if (p.method === "mobile_money") {
      if (!String(p.mobileProvider || "").trim()) e.mobileProvider = t("Required");
      if (!String(p.mobileNo || "").trim()) e.mobileNo = t("Required");
      if (!String(p.accountName || "").trim()) e.accountName = t("Required");
    } else if (p.method === "alipay") {
      if (!String(p.accountName || "").trim()) e.accountName = t("Required");
      if (!String(p.alipayLogin || "").trim()) e.alipayLogin = t("Required");
    } else if (p.method === "wechat_pay") {
      if (!String(p.accountName || "").trim()) e.accountName = t("Required");
      if (!String(p.wechatId || "").trim()) e.wechatId = t("Required");
      if (!String(p.accountNo || "").trim()) e.accountNo = t("Required");
    } else {
      if (!String(p.otherMethod || "").trim()) e.otherMethod = t("Required");
      if (!String(p.otherProvider || "").trim()) e.otherProvider = t("Required");
    }

    return e;
  }, [form.payout, t]);

  const taxOk = useMemo(() => {
    const tax = form.tax || {};
    return (
      !!String(tax.legalName || "").trim() &&
      !!String(tax.taxCountry || "").trim() &&
      !!String(tax.taxId || "").trim() &&
      (!!String(tax.contactEmail || "").trim() ? isEmail(tax.contactEmail) : false)
    );
  }, [form.tax]);

  const taxErrors = useMemo<Record<string, string>>(() => {
    const tax = form.tax || ({} as TaxForm);
    const e: Record<string, string> = {};
    if (!String(tax.legalName || "").trim()) e.legalName = t("Required");
    if (!String(tax.taxCountry || "").trim()) e.taxCountry = t("Required");
    if (!String(tax.taxId || "").trim()) e.taxId = t("Required");
    if (!String(tax.contactEmail || "").trim()) e.contactEmail = t("Required");
    else if (!isEmail(tax.contactEmail)) e.contactEmail = t("Invalid");
    return e;
  }, [form.tax, t]);

  const legalOk = useMemo(() => {
    const a = form.acceptance || {};
    return !!a.sellerTerms && !!a.contentPolicy && !!a.dataProcessing;
  }, [form.acceptance]);

  const legalErrors = useMemo(() => {
    const a = form.acceptance || {};
    return {
      sellerTerms: !a.sellerTerms ? t("Required") : "",
      contentPolicy: !a.contentPolicy ? t("Required") : "",
      dataProcessing: !a.dataProcessing ? t("Required") : "",
    };
  }, [form.acceptance, t]);

  const requiredOk = useMemo(
    () => ({
      store: Object.keys(storeErrors).length === 0 && slugState.status !== "checking",
      catalog: catalogOk,
      docs: docsStats.allOk,
      shipping: shippingOk,
      payout: payoutOk,
      tax: taxOk,
      legal: legalOk,
    }),
    [storeErrors, slugState.status, catalogOk, docsStats.allOk, shippingOk, payoutOk, taxOk, legalOk]
  );

  const steps = useMemo(
    () => [
      { n: 1, key: "store", title: t("Store Profile"), subtitle: t("Identity, branding and contact"), ok: requiredOk.store },
      { n: 2, key: "catalog", title: t("Catalog & Channels"), subtitle: t("Categories, channels and languages"), ok: requiredOk.catalog },
      { n: 3, key: "docs", title: t("Compliance & Documents"), subtitle: t("Required documents for review"), ok: requiredOk.docs },
      { n: 4, key: "shipping", title: t("Shipping & Policies"), subtitle: t("Shipping profile and policy presets"), ok: requiredOk.shipping },
      { n: 5, key: "payout", title: t("Payout & Tax"), subtitle: t("Payout method and tax details"), ok: requiredOk.payout && requiredOk.tax },
      { n: 6, key: "review", title: t("Review & Submit"), subtitle: t("Confirm and submit"), ok: Object.values(requiredOk).every(Boolean) },
    ],
    [t, requiredOk]
  );

  const markStepError = useCallback(
    (n) => setStepErrors((prev) => ({ ...prev, [n]: true })),
    []
  );

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
          tone: "error",
          title: t("Step required"),
          message: t(`Complete Step ${current.n}: ${current.title} before continuing.`),
        });
        return;
      }
      const missing = steps.find((s) => s.n < target && !s.ok);
      if (missing) {
        markStepError(missing.n);
        setToast({
          tone: "error",
          title: t("Step required"),
          message: t(`Complete Step ${missing.n}: ${missing.title} before continuing.`),
        });
        setStep(missing.n);
        return;
      }
      setStep(target);
    },
    [setStep, setToast, step, steps, t]
  );

  const showStoreErrors = !!stepErrors[1];
  const showCatalogErrors = !!stepErrors[2];
  const showDocsErrors = !!stepErrors[3];
  const showShippingErrors = !!stepErrors[4];
  const showPayoutErrors = !!stepErrors[5];
  const showLegalErrors = !!stepErrors[6];

  const completion = useMemo(() => {
    const okCount = Object.values(requiredOk).filter(Boolean).length;
    const total = Object.keys(requiredOk).length;
    return Math.round((okCount / total) * 100);
  }, [requiredOk]);

  // Keep owner consistent
  useEffect(() => {
    if (!activeUserId) return;
    const owner = String(form.owner || form.email || "").toLowerCase();
    if (owner && owner !== activeUserId) {
      clearStoredDraft([STORAGE.form, STORAGE.ui, STORAGE.review, STORAGE.legacy]);
      const fresh = createEmptyForm();
      setForm(fresh);
      const id = activeUserId || form.email || form.storeName || "";
      recordOnboardingStatus("seller", sessionUser || { userId: id, email: id }, "DRAFT");
      setToast({
        tone: "info",
        title: "Switched user context",
        message: "We loaded a fresh draft for the current session user.",
      });
      return;
    }
    if (!form.owner && activeUserId) {
      setF((prev) => (prev.owner ? null : { owner: activeUserId }));
    }
  }, [activeUserId, createEmptyForm, form.email, form.owner, sessionUser, form.storeName]);

  // Actions
  const ensureMinimum = () => {
    const updates: Partial<SellerForm> = {};
    if (!form.storeSlug && form.storeName) updates.storeSlug = kebab(form.storeName);
    if (!form.payout.notificationsEmail && isEmail(form.email)) {
      updates.payout = { ...form.payout, notificationsEmail: form.email };
    }
    if (Object.keys(updates).length) setF(updates);
    return { ...form, ...updates };
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "seller_onboarding.json";
    a.click();
    setToast({ tone: "success", title: "Exported", message: "Seller onboarding JSON downloaded." });
  };

  const importRef = useRef<HTMLInputElement | null>(null);
  const importJSON = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result || "{}"));
        setForm({ ...createEmptyForm(), ...obj });
        setToast({ tone: "success", title: "Imported", message: "Your JSON draft has been loaded." });
      } catch {
        setToast({ tone: "error", title: "Invalid JSON", message: "Please choose a valid JSON file." });
      }
    };
    r.readAsText(f);
  };

  const resetDraft = async () => {
    if (!window.confirm("Reset this onboarding draft? This clears the saved draft on this device and the backend draft.")) return;
    const fresh = createEmptyForm();
    setForm(fresh);
    setReview(DEFAULT_REVIEW_STATE);
    setStep(1);
    clearStoredDraft([STORAGE.form, STORAGE.ui, STORAGE.review, STORAGE.legacy]);
    try {
      await Promise.all([
        sellerBackendApi.resetOnboarding(),
        sellerBackendApi.patchWorkflowScreenState("seller-onboarding", {
          ui: { ...ui, step: 1 },
          review: DEFAULT_REVIEW_STATE,
        }),
      ]);
    } catch {
      setToast({
        tone: "error",
        title: "Reset failed",
        message: "We could not reset the backend onboarding draft.",
      });
      return;
    }
    recordOnboardingStatus("seller", sessionUser || { userId: activeUserId || "" }, "DRAFT");
    setToast({ tone: "success", title: "Reset complete", message: "A fresh draft has been created." });
  };

  const withdraw = async () => {
    setF({ status: "DRAFT" });
    setReview((r) => ({ ...r, submittedAt: null, inReviewAt: null, approvedAt: null }));
    try {
      await Promise.all([
        sellerBackendApi.patchOnboarding({
          status: "draft",
          profileType: "SELLER",
        }),
        sellerBackendApi.patchWorkflowScreenState("seller-onboarding", {
          review: { ...DEFAULT_REVIEW_STATE },
        }),
      ]);
    } catch {
      setToast({
        tone: "error",
        title: "Withdraw failed",
        message: "We could not reopen the onboarding draft from the backend.",
      });
      return;
    }
    recordOnboardingStatus(
      "seller",
      sessionUser || { userId: activeUserId || form.email, email: activeUserId || form.email },
      "DRAFT"
    );
    setToast({ tone: "info", title: "Withdrawn", message: "Your application is now editable again." });
  };

  // Helper function to get specific missing fields
  const getMissingFields = useCallback(() => {
    const missingFields: string[] = [];

    // Store fields
    if (!requiredOk.store) {
      if (!String(form.storeName || "").trim()) missingFields.push(t("Brand Name"));
      if (!String(form.storeSlug || "").trim()) missingFields.push(t("Store handle"));
      if (form.storeSlug && slugState.status === "invalid") missingFields.push(t("Store handle") + " (" + t("Invalid") + ")");
      if (form.storeSlug && slugState.status === "taken") missingFields.push(t("Store handle") + " (" + t("Taken") + ")");
      if (!String(form.email || "").trim()) missingFields.push(t("Email"));
      else if (form.email && !isEmail(form.email)) missingFields.push(t("Email") + " (" + t("Invalid") + ")");
    }

    // Catalog fields
    if (!requiredOk.catalog) {
      const selections = Array.isArray(form.taxonomySelections) ? form.taxonomySelections : [];
      if (selections.length === 0) {
        missingFields.push(t("Marketplace Taxonomy"));
      } else {
        const allSub = selections.every((line) => {
          const lastNode = line?.pathNodes?.[line.pathNodes.length - 1];
          return lastNode?.type === "Sub-Category";
        });
        if (!allSub) missingFields.push(t("Marketplace Taxonomy") + " (" + t("Sub-Category required") + ")");
      }
      if (!Array.isArray(form.channels) || form.channels.length === 0) {
        missingFields.push(t("Channels"));
      }
    }

    // Documents
    if (!requiredOk.docs) {
      missingFields.push(t("Compliance & Documents"));
    }

    // Shipping fields
    if (!requiredOk.shipping) {
      if (!String(form.shipping?.profileId || "").trim()) missingFields.push(t("Default Shipping Profile"));
      if (String(form.policies?.returnsDays ?? "").trim() === "") missingFields.push(t("Returns Policy (days)"));
      if (String(form.shipping?.handlingTimeDays ?? "").trim() === "") missingFields.push(t("Handling Time (days)"));
    }

    // Payout fields
    if (!requiredOk.payout) {
      const p = form.payout || {};
      if (!p.currency) missingFields.push(t("Payout Currency"));
      if (!p.confirmDetails) missingFields.push(t("Payout Details Confirmation"));
      if (payoutUsesAccount(p.method)) {
        if (!String(p.bankName || "").trim()) missingFields.push(t("Bank Name"));
        if (!String(p.accountName || "").trim()) missingFields.push(t("Account Name"));
        if (!String(p.accountNo || "").trim()) missingFields.push(t("Account Number"));
      } else if (payoutUsesMobile(p.method)) {
        if (!String(p.mobileProvider || "").trim()) missingFields.push(t("Mobile Provider"));
        if (!String(p.mobileNo || "").trim()) missingFields.push(t("Mobile Number"));
        if (!String(p.accountName || "").trim()) missingFields.push(t("Account Name"));
      } else {
        if (!String(p.otherMethod || "").trim()) missingFields.push(t("Payment Method"));
        if (!String(p.otherProvider || "").trim()) missingFields.push(t("Payment Provider"));
      }
    }

    // Tax fields
    if (!requiredOk.tax) {
      const tax = form.tax || {};
      if (!String(tax.legalName || "").trim()) missingFields.push(t("Legal name"));
      if (!String(tax.taxCountry || "").trim()) missingFields.push(t("Tax Country"));
      if (!String(tax.taxId || "").trim()) missingFields.push(t("Tax ID"));
      if (String(tax.contactEmail || "").trim() && !isEmail(tax.contactEmail)) {
        missingFields.push(t("Tax Contact Email") + " (" + t("Invalid") + ")");
      }
    }

    // Legal acceptance
    if (!requiredOk.legal) {
      const a = form.acceptance || {};
      if (!a.sellerTerms) missingFields.push(t("Seller Terms"));
      if (!a.contentPolicy) missingFields.push(t("Content Policy"));
      if (!a.dataProcessing) missingFields.push(t("Data Processing Agreement"));
    }

    return missingFields;
  }, [form, requiredOk, slugState.status, t]);

  const submit = async () => {
    const nextState = ensureMinimum();

    const blockers = {
      store: requiredOk.store,
      catalog: requiredOk.catalog,
      docs: requiredOk.docs,
      shipping: requiredOk.shipping,
      payout: requiredOk.payout,
      tax: requiredOk.tax,
      legal: requiredOk.legal,
    };

    if (Object.values(blockers).some((ok) => !ok)) {
      setStepErrors((prev) => ({
        ...prev,
        1: prev[1] || !requiredOk.store,
        2: prev[2] || !requiredOk.catalog,
        3: prev[3] || !requiredOk.docs,
        4: prev[4] || !requiredOk.shipping,
        5: prev[5] || !requiredOk.payout || !requiredOk.tax,
        6: prev[6] || !requiredOk.legal,
      }));
      const missingFields = getMissingFields();
      setToast({
        tone: "error",
        title: t("Complete required items"),
        message: missingFields.length > 0
          ? `${t("Missing required fields")}: ${missingFields.join(", ")}.`
          : `${t("Missing")}: ${Object.entries(blockers).filter(([, ok]) => !ok).map(([k]) => k).join(", ")}. ${t("Check REQ markers and the checklist on the right.")}`,
      });
      return;
    }

    const submittedDocs = (nextState.docs.list || []).map((doc) => ({ ...doc, status: "Submitted" }));
    const submittedAt = new Date().toISOString();

    try {
      await Promise.all([
        sellerBackendApi.submitOnboarding({
          ...toOnboardingPayload(nextState, sellerTaxonomy),
          docs: toOnboardingDocsPayload(submittedDocs),
          status: "submitted",
        }),
        sellerBackendApi.patchWorkflowScreenState("seller-onboarding", {
          ui,
          review: {
            ...review,
            submittedAt,
            inReviewAt: null,
            approvedAt: submittedAt,
          },
        }),
      ]);
    } catch (submitError) {
      console.error("[SellerOnboarding] Submit failed:", submitError);
      setToast({
        tone: "error",
        title: "Submit failed",
        message: "Your onboarding could not be submitted to the backend.",
      });
      return;
    }

    setF({
      status: "SUBMITTED",
      docs: { list: submittedDocs },
    });
    setReview((r) => ({ ...r, submittedAt, inReviewAt: null, approvedAt: submittedAt }));
    recordOnboardingStatus(
      "seller",
      sessionUser || { userId: activeUserId || form.email, email: activeUserId || form.email },
      "SUBMITTED"
    );

    setToast({
      tone: "success",
      title: "Submitted",
      message: "Your onboarding is active. Please sign in again to continue.",
    });
    await authClient.signOut(
      typeof sessionUser?.refreshToken === "string" ? sessionUser.refreshToken : undefined,
      typeof sessionUser?.accessToken === "string" ? sessionUser.accessToken : undefined
    );
    clearSession();
    navigate("/auth?intent=signin", { replace: true, state: { defaultTab: "signin" } });
  };

  const storefrontUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const slug = String(form.storeSlug || "").trim();
    return slug ? `${window.location.origin}/s/${slug}` : "";
  }, [form.storeSlug]);

  const policyPreview = useMemo(
    () => buildPolicyPreview({ storeName: form.storeName, policies: form.policies, shipping: form.shipping }),
    [form.storeName, form.policies, form.shipping]
  );

  // Channel toggle
  const toggleChannel = (id) => {
    if (isLocked) return;
    setF((prev) => {
      const cur = Array.isArray(prev.channels) ? prev.channels : [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { channels: next };
    });
  };

  // Language toggle
  const toggleLanguage = (code) => {
    if (isLocked) return;
    setF((prev) => {
      const cur = Array.isArray(prev.languages) ? prev.languages : [];
      const next = cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code];
      return { languages: next };
    });
  };

  const applyPolicyPreset = (presetId) => {
    const p = lookups.policyPresets.find((x) => x.id === presetId);
    if (!p || isLocked) return;
    setF((prev) => ({
      shipping: { ...prev.shipping, handlingTimeDays: p.patch.handlingTimeDays },
      policies: { ...prev.policies, returnsDays: p.patch.returnsDays, warrantyDays: p.patch.warrantyDays },
    }));
    setToast({ tone: "success", title: "Preset applied", message: `Applied: ${p.label}` });
  };

  const handleTaxonomySelectionsUpdate = useCallback(
    (selections: TaxonomySelection[] = []) => {
      const normalized = Array.isArray(selections) ? selections : [];
      setF({
        taxonomySelections: normalized,
        taxonomySelection: normalized[normalized.length - 1] || null,
      });
    },
    [setF]
  );

  const asideTips = useMemo(() => {
    if (step === 1) {
      const suggested = form.storeName ? kebab(form.storeName) : "";
      return {
        title: "Pro tips",
        items: [
          "Use a brand name that customers can remember.",
          "Keep your handle short, clean, and consistent across social channels.",
          suggested ? `Suggested handle: ${suggested}` : "Add a store name to get a suggested handle.",
        ],
      };
    }

    if (step === 2) {
      return {
        title: "Catalog readiness",
        items: [
          "Select sub-categories, not just categories. This improves search and compliance.",
          "Enable Wholesale if you plan MOQ pricing and quotes.",
          "Add more languages to improve conversion across regions.",
        ],
      };
    }

    if (step === 3) {
      return {
        title: "Compliance and trust",
        items: [
          "Upload clear documents (no blur, no screenshots of PDFs).",
          "Set expiry dates where applicable to avoid delays.",
          "If you sell batteries or chargers, product certificates help approval.",
        ],
      };
    }

    if (step === 4) {
      return {
        title: "Policy presets",
        items: [
          "Returns and handling time strongly impact conversion and disputes.",
          "Use the Standard preset unless you have a category-specific policy.",
          "If you offer express shipping, ensure stock is available locally.",
        ],
      };
    }

    if (step === 5) {
      return {
        title: "Payout and tax",
        items: [
          "Double-check payout details before submitting.",
          "Use a business legal name as on registration documents.",
          "Add a valid contact email for tax and invoicing.",
        ],
      };
    }

    return {
      title: "Final review",
      items: [
        "Confirm everything is accurate to avoid review delays.",
        "Agree to seller terms, content policy and data processing.",
        "Submit when all checklist items show OK.",
      ],
    };
  }, [step, form.storeName]);

  return (
    <div className="onboard-shell" data-theme={resolvedMode}>
      <style>{`
        :root{ --ev-green:${BRAND.green}; --ev-orange:${BRAND.orange}; --ev-text:${BRAND.slate900}; --ev-subtle:${BRAND.slate600}; --ev-muted:${BRAND.slate500}; --ev-border:${BRAND.slate300}; }

        .onboard-shell{ min-height:100vh; padding-bottom:36px;
          --ev-primary-soft: rgba(3,205,140,.10);
          --ev-accent-soft: rgba(247,127,0,.12);
          --ev-surface-page: #F5F7FB;
          --ev-surface: rgba(255,255,255,.96);
          --ev-surface-alt: #F9FBFF;
          --ev-border-strong: #E2E8F0;
          --ev-text-main: #0F172A;
          --ev-text-subtle: #64748B;
          --ev-text-muted: #94A3B8;
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
          --ev-primary-soft: rgba(3,205,140,.16);
          --ev-accent-soft: rgba(247,127,0,.18);
          --ev-surface-page: #08111d;
          --ev-surface: rgba(15,23,42,.92);
          --ev-surface-alt: rgba(15,23,42,.72);
          --ev-border-strong: rgba(71,85,105,.72);
          --ev-text-main: #E5E7EB;
          --ev-text-subtle: #CBD5E1;
          --ev-text-muted: #94A3B8;
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
        .hero-copy{ flex:1 1 420px; display:flex; flex-direction:column; gap:6px; min-width:0; }
        .hero-headline{ display:flex; flex-wrap:wrap; align-items:baseline; gap:10px; }
        .hero-title{ font-size:20px; font-weight:1000; color:var(--ev-text); margin:0; line-height:1; }
        .hero-sub{ font-size:12px; color:var(--ev-subtle); margin:0; max-width:none; }

        .hero-actions{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:flex-start; flex:1 1 420px; min-width:0; }
        .hero-metrics{ display:flex; align-items:center; gap:6px; margin:0; flex-wrap:wrap; }
        .metric{ border-radius:14px; padding:6px 10px; background:rgba(255,255,255,.84); border:1px solid rgba(203,213,225,.65); box-shadow:0 14px 30px -28px rgba(15,23,42,.35); min-height:34px; }
        .onboard-shell[data-theme="dark"] .metric{ background: rgba(10,12,18,.75); border-color: rgba(148,163,184,.18); box-shadow:none; }
        .metric span{ font-size:8px; letter-spacing:.14em; text-transform:uppercase; color:var(--ev-muted); font-weight:900; }
        .metric strong{ display:block; margin-top:2px; font-size:14px; color:var(--ev-text); }
        @media (max-width: 1280px){
          .hero-inner{ align-items:flex-start; }
          .hero-copy,
          .hero-actions{ flex-basis:100%; }
          .hero-actions{ justify-content:space-between; }
        }
        @media (max-width: 900px){
          .hero-title{ font-size:18px; line-height:1.1; }
          .hero-headline{ align-items:flex-start; }
        }
        @media (max-width: 640px){
          .hero-inner{ padding:10px 12px; }
          .hero-actions{ justify-content:flex-start; }
          .hero-metrics{ width:100%; }
        }

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

        .slugState{ display:flex; align-items:center; gap:8px; font-size:12px; font-weight:900; }
        .slug-ok{ color:#059669; }
        .slug-bad{ color:#b91c1c; }
        .slug-warn{ color:#b45309; }

        .grid2{ display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
        @media (max-width: 640px){ .grid2{ grid-template-columns: 1fr; } }

        .channelCard{ border-radius: 18px; border: 1px solid rgba(203,213,225,.70); background: rgba(255,255,255,.85); padding: 12px; cursor: pointer; }
        .channelCard:hover{ border-color: rgba(3,205,140,.30); }
        .channelOn{ border: 2px solid rgba(3,205,140,.55); background: rgba(3,205,140,.10); }
        .onboard-shell[data-theme="dark"] .channelCard{ background: rgba(15,23,42,.55); border-color: rgba(148,163,184,.18); }
        .onboard-shell[data-theme="dark"] .channelOn{ background: rgba(3,205,140,.14); border-color: rgba(3,205,140,.28); }

        .docRow{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 10px; border-radius:14px; border:1px solid rgba(203,213,225,.65); background: rgba(255,255,255,.86); }
        .onboard-shell[data-theme="dark"] .docRow{ background: rgba(15,23,42,.55); border-color: rgba(148,163,184,.18); }

        .docOk{ border-color: rgba(3,205,140,.35); }
        .docMiss{ border-color: rgba(239,68,68,.28); }

        .footerNav{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
      `}</style>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <header className="onboard-hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-headline">
              <h1 className="hero-title">{t("Launch your marketplace storefront")}</h1>
              <span className="hero-sub">
                {t(
                  "Complete these steps to unlock listings, quotes, live sessions, wholesale pricing, and payouts on EVzone."
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="pill">
                {t("Status:")} <StatusChip s={form.status} />
              </span>
              <span className="pill">{t("Checklist")} {completion}%</span>
              <span className="pill">{t("Docs")} {docsStats.total}</span>
              <span className="pill">{t("Channels")} {(form.channels || []).length}</span>
            </div>
          </div>

          <div className="hero-actions">
            <div className="flex flex-wrap items-center gap-2">
              <div className="hero-metrics">
                <div className="metric">
                  <span>{t("Autosaved")}</span>
                  <strong>{lastSaved || "N/A"}</strong>
                </div>
                <div className="metric">
                  <span>{t("Categories")}</span>
                  <strong>{(form.taxonomySelections || []).length}</strong>
                </div>
                <div className="metric">
                  <span>{t("Readiness")}</span>
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
                {t("Reset")}
              </button>
              {form.status === "SUBMITTED" ? (
                <button type="button" onClick={withdraw} className="btn-ghost">
                  {t("Withdraw")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={submit}
                className="btn-primary"
                disabled={form.status !== "DRAFT"}
              >
                {t("Submit")}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Submitted panel */}
      {form.status === "SUBMITTED" ? (
        <div className="mx-auto mt-4 w-full max-w-none px-4">
          <div className="card-mini">
            <div className="flex items-center justify-between gap-2">
              <div className="font-black text-sm">{t("Submitted - Pending Review")}</div>
              <div className="text-xs text-[var(--ev-subtle)]">
                {t("SLA:")} <b>{review.slaHours}h</b>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
              <div className="card-mini">
                <div className="font-bold">{t("Submitted")}</div>
                <div className="text-[var(--ev-subtle)]">
                  {review.submittedAt ? new Date(review.submittedAt).toLocaleString() : "N/A"}
                </div>
              </div>
              <div className="card-mini">
                <div className="font-bold">{t("In Review")}</div>
                <div className="text-[var(--ev-subtle)]">
                  {review.inReviewAt ? new Date(review.inReviewAt).toLocaleString() : "Pending"}
                </div>
              </div>
              <div className="card-mini">
                <div className="font-bold">{t("Approved")}</div>
                <div className="text-[var(--ev-subtle)]">
                  {review.approvedAt ? new Date(review.approvedAt).toLocaleString() : "Pending"}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="bar">
                <span
                  style={{
                    width: review.approvedAt
                      ? "100%"
                      : review.inReviewAt
                        ? "66%"
                        : review.submittedAt
                          ? "33%"
                          : "0%",
                  }}
                />
              </div>
              <div className="mt-1 text-[11px] text-[var(--ev-subtle)]">
                {t("Timeline: Submitted -> In Review -> Approved")}
              </div>
            </div>
            <div className="mt-2 text-xs text-[var(--ev-subtle)]">
              {t("Approval tracking becomes available after you submit onboarding.")}
            </div>
          </div>
        </div>
      ) : null}

      <main className="w-full max-w-none px-[0.55%] py-6">
        {/* Stepper */}
        <div className="stepper">
          {steps.map((s) => (
            <button
              key={s.n}
              type="button"
              className="stepbtn"
              onClick={() => goStep(s.n)}
            >
              <span className={`stepdot ${step === s.n ? "stepdot-on" : "stepdot-off"}`}>{s.n}</span>
              <span className="steptxt">
                <b className="truncate">{s.title}</b>
                <span className="truncate">{s.subtitle}</span>
              </span>
              <span className={`chip ${s.ok ? "chip-ok" : "chip-neutral"}`}>{s.ok ? "OK" : "REQ"}</span>
            </button>
          ))}
        </div>

        <div className="bar mb-4">
          <span style={{ width: `${completion}%` }} />
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="xl:col-span-2 space-y-4">
            {/* Step 1 */}
            {step === 1 ? (
              <Section
                title={
                  <span>
                    {t("Store Profile")} <Req ok={requiredOk.store} />
                  </span>
                }
                sub={t("Identity, branding, contact, and ship-from location")}
                lastSaved={lastSaved}
                right={
                  <span className="chip chip-neutral">
                    <IconSparkles /> {t("Premium setup")}
                  </span>
                }
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <Field label={t("Brand Name")} required error={storeErrors.storeName}>
                    <input
                      value={form.storeName}
                      onChange={(e) => setF({ storeName: e.target.value })}
                      className={`input w-full ${showStoreErrors && storeErrors.storeName ? "input-error" : ""}`}
                      disabled={isLocked}
                      placeholder={t("e.g. EV World")}
                    />
                  </Field>

                  <Field
                    label={t("Store handle")}
                    required
                    error={storeErrors.storeSlug}
                    helper={storefrontUrl ? storefrontUrl : t("Your store URL will appear here")}
                  >
                    <div className="space-y-2">
                      <input
                        value={form.storeSlug}
                        onChange={(e) => setF({ storeSlug: kebab(e.target.value) })}
                        placeholder={t("my-shop")}
                        className={`input w-full ${showStoreErrors && storeErrors.storeSlug ? "input-error" : ""}`}
                        disabled={isLocked}
                      />
                      {form.storeSlug ? (
                        <div
                          className={`slugState ${slugState.status === "ok"
                              ? "slug-ok"
                              : slugState.status === "checking"
                                ? "slug-warn"
                                : slugState.status === "taken" || slugState.status === "invalid"
                                  ? "slug-bad"
                                  : ""
                            }`}
                        >
                          {slugState.status === "ok" ? (
                            <IconCheck />
                          ) : slugState.status === "checking" ? (
                            <IconClock />
                          ) : (
                            <IconWarn />
                          )}
                          <span>{slugState.message}</span>
                        </div>
                      ) : null}
                      {form.storeName && !form.storeSlug ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setF({ storeSlug: kebab(form.storeName) })}
                          disabled={isLocked}
                        >
                          {t("Use suggested")}: <b>{kebab(form.storeName)}</b>
                        </button>
                      ) : null}
                    </div>
                  </Field>

                  <Field
                    label={t("Email")}
                    required
                    error={storeErrors.email}
                    helper={t("Used for login, payouts and support")}
                  >
                    <input
                      value={form.email}
                      onChange={(e) => setF({ email: e.target.value })}
                      className={`input w-full ${showStoreErrors && storeErrors.email ? "input-error" : ""}`}
                      disabled={isLocked}
                      placeholder={t("you@company.com")}
                    />
                  </Field>

                  <Field label={t("Phone")} helper={t("Select a country code and enter the number")}>
                    {(() => {
                      const phoneParts = splitPhoneNumber(form.phone);
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
                            placeholder={t("700 000 000")}
                          />
                        </div>
                      );
                    })()}
                  </Field>

                  <Field label={t("Website (optional)")}>
                    <input
                      value={form.website}
                      onChange={(e) => setF({ website: e.target.value })}
                      className="input w-full"
                      disabled={isLocked}
                      placeholder={t("https://")}
                    />
                  </Field>

                  <Field
                    label={t("Support WhatsApp (optional)")}
                    helper={t("Shown to customers as a support contact")}
                  >
                    {(() => {
                      const whatsappParts = splitPhoneNumber(form.support?.whatsapp || "");
                      return (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Box className="w-full sm:w-44">
                            <CountryCodeAutocomplete
                              value={whatsappParts.code}
                              onChange={(nextCode) =>
                                setF({
                                  support: {
                                    ...(form.support || {}),
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
                                  ...(form.support || {}),
                                  whatsapp: combinePhoneNumber(whatsappParts.code, e.target.value),
                                },
                              })
                            }
                            className="input w-full"
                            disabled={isLocked}
                            placeholder={t("700 000 000")}
                          />
                        </div>
                      );
                    })()}
                  </Field>

                  <div className="sm:col-span-2">
                    <Field
                      label={t("Short description")}
                      helper={t("A short, customer-friendly description of what you sell")}
                    >
                      <textarea
                        rows={3}
                        value={form.about}
                        onChange={(e) => setF({ about: e.target.value })}
                        className="input w-full"
                        disabled={isLocked}
                        placeholder={t("We sell EV chargers, e-bikes, spare parts and accessories...")}
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="grid2">
                      <div>
                        <Field
                          label={t("Brand color")}
                          helper={t("Used on your storefront for buttons and highlights")}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.brandColor}
                              onChange={(e) => setF({ brandColor: e.target.value })}
                              disabled={isLocked}
                              className="h-10 w-10 cursor-pointer rounded border border-gray-200 dark:border-slate-800 p-0"
                            />
                            <input
                              value={form.brandColor}
                              onChange={(e) => setF({ brandColor: e.target.value })}
                              placeholder={BRAND.green}
                              className="input w-full"
                              disabled={isLocked}
                            />
                          </div>
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <div className="text-xs font-semibold text-[var(--ev-subtle)]">{t("Logo")}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={isLocked}
                              onClick={() => logoInputRef.current && logoInputRef.current.click()}
                            >
                              {t("Upload")}
                            </button>
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isLocked}
                              onChange={(e) => {
                                const f = e.target.files && e.target.files[0];
                                if (f) handleImagePick("logoUrl", f);
                                if (logoInputRef.current) logoInputRef.current.value = "";
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-[var(--ev-subtle)]">{t("Cover (optional)")}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={isLocked}
                              onClick={() => coverInputRef.current && coverInputRef.current.click()}
                            >
                              {t("Upload")}
                            </button>
                            <input
                              ref={coverInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isLocked}
                              onChange={(e) => {
                                const f = e.target.files && e.target.files[0];
                                if (f) handleImagePick("coverUrl", f);
                                if (coverInputRef.current) coverInputRef.current.value = "";
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Field
                      label={t("Ship-from address")}
                      required
                      helper={t("Used for shipping quotes and customer estimates")}
                    >
                      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          value={form.shipFrom?.country || ""}
                          onChange={(e) =>
                            setF({ shipFrom: { ...(form.shipFrom || {}), country: e.target.value } })
                          }
                          placeholder={t("Country")}
                          className="input w-full"
                          disabled={isLocked}
                        />
                        <input
                          value={form.shipFrom?.province || ""}
                          onChange={(e) =>
                            setF({ shipFrom: { ...(form.shipFrom || {}), province: e.target.value } })
                          }
                          placeholder={t("State / Province")}
                          className="input w-full"
                          disabled={isLocked}
                        />
                        <input
                          value={form.shipFrom?.city || ""}
                          onChange={(e) =>
                            setF({ shipFrom: { ...(form.shipFrom || {}), city: e.target.value } })
                          }
                          placeholder={t("City")}
                          className="input w-full"
                          disabled={isLocked}
                        />
                        <input
                          value={form.shipFrom?.postalCode || ""}
                          onChange={(e) =>
                            setF({ shipFrom: { ...(form.shipFrom || {}), postalCode: e.target.value } })
                          }
                          placeholder={t("Postal code")}
                          className="input w-full"
                          disabled={isLocked}
                        />
                        <input
                          value={form.shipFrom?.address1 || ""}
                          onChange={(e) =>
                            setF({ shipFrom: { ...(form.shipFrom || {}), address1: e.target.value } })
                          }
                          placeholder={t("Address line 1")}
                          className="input w-full sm:col-span-1"
                          disabled={isLocked}
                        />
                        <input
                          value={form.shipFrom?.address2 || ""}
                          onChange={(e) =>
                            setF({ shipFrom: { ...(form.shipFrom || {}), address2: e.target.value } })
                          }
                          placeholder={t("Address line 2 (optional)")}
                          className="input w-full sm:col-span-1"
                          disabled={isLocked}
                        />
                      </div>
                    </Field>
                  </div>
                </div>

                {/* Storefront Preview */}
                <div className="mt-4 card-mini">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-black">{t("Storefront preview")}</div>
                    <span className="chip chip-neutral">{t("Preview")}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr] lg:grid-cols-[170px_1fr]">
                    <div
                      className="rounded-2xl border overflow-hidden min-h-[110px] sm:min-h-[130px]"
                      style={{
                        borderColor: "rgba(203,213,225,.65)",
                        background: form.coverUrl
                          ? `url(${form.coverUrl}) center/cover no-repeat`
                          : `linear-gradient(135deg, rgba(3,205,140,.16), rgba(247,127,0,.12))`,
                      }}
                    >
                      <div
                        className="p-3 flex items-end justify-between h-full"
                        style={{ background: form.coverUrl ? "rgba(0,0,0,.18)" : "transparent" }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-10 w-10 rounded-xl border flex items-center justify-center overflow-hidden"
                            style={{
                              borderColor: "rgba(255,255,255,.45)",
                              background: form.brandColor || BRAND.green,
                            }}
                          >
                            {form.logoUrl ? (
                              <img alt="logo" src={form.logoUrl} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-white font-black">
                                {(form.storeName || "S").slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-black text-sm truncate">
                              {form.storeName || t("Your Store")}
                            </div>
                            <div className="text-white/90 text-[11px] truncate">
                              {form.storeSlug ? `@${form.storeSlug}` : "@handle"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[var(--ev-subtle)]">
                          {t("What customers will see")}
                        </div>
                        <div className="text-sm font-black">{form.storeName || t("Your Store")}</div>
                        <div className="text-xs text-[var(--ev-subtle)]">
                          {form.about || t("Add a short store description to improve trust and conversion.")}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="chip chip-ok inline-flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full border"
                            style={{
                              background: form.brandColor || BRAND.green,
                              borderColor: "rgba(3,205,140,.35)",
                            }}
                          />
                          {t("Primary color")}: {form.brandColor || BRAND.green}
                        </span>
                        <span className="chip chip-neutral">{t("Ship-from")}: {form.shipFrom?.country || "N/A"}</span>
                        {storefrontUrl ? (
                          <a
                            href={storefrontUrl}
                            className="underline text-sm font-bold"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t("Open store link")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            {/* Step 2 */}
            {step === 2 ? (
              <Section
                title={
                  <span>
                    {t("Catalog & Channels")} <Req ok={requiredOk.catalog} />
                  </span>
                }
                sub={t("Select sub-categories, enable channels, and choose supported languages")}
                lastSaved={lastSaved}
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-[var(--ev-subtle)] mb-2">
                      {t("Marketplace taxonomy")}
                    </div>
                    <SellerOnboardingTaxonomyNavigator
                      selections={form.taxonomySelections || []}
                      onChange={handleTaxonomySelectionsUpdate}
                      taxonomyData={sellerTaxonomy}
                      onRetry={sellerTaxonomyQuery.refetch}
                      disabled={isLocked}
                    />
                    <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                      {t("Tip: Only sub-category selections are accepted for onboarding approval.")}
                    </div>
                    {showCatalogErrors && catalogErrors.selections ? (
                      <div className="mt-1 text-xs font-bold text-red-600">{catalogErrors.selections}</div>
                    ) : null}
                  </div>

                  <Divider />

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t("Sales channels")}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t("Enable the channels you plan to use. Some channels require extra documents.")}
                        </div>
                      </div>
                      <span className="chip chip-neutral">{(form.channels || []).length} selected</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {CHANNEL_OPTIONS.map((c) => {
                        const on = (form.channels || []).includes(c.id);
                        return (
                          <div
                            key={c.id}
                            className={`channelCard ${on ? "channelOn" : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleChannel(c.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") toggleChannel(c.id);
                            }}
                            aria-pressed={on}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-black">{t(c.label)}</div>
                                <div className="text-xs text-[var(--ev-subtle)] mt-0.5">{t(c.desc)}</div>
                              </div>
                              <span className={`chip ${on ? "chip-ok" : "chip-neutral"}`}>{on ? "ON" : "OFF"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {showCatalogErrors && catalogErrors.channels ? (
                      <div className="mt-2 text-xs font-bold text-red-600">{catalogErrors.channels}</div>
                    ) : null}

                    {form.channels?.includes("wholesale_b2b") ? (
                      <div className="mt-3 card-mini">
                        <div className="text-sm font-black">{t("Wholesale note")}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-1">
                          {t("Wholesale sellers may be asked for Import/Export License or additional verification.")}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <Divider />

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t("Supported languages")}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t("Select languages you can support in messages and product descriptions.")}
                        </div>
                      </div>
                      <span className="chip chip-neutral">{(form.languages || []).length} selected</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((l) => (
                        <ChipButton
                          key={l.code}
                          active={(form.languages || []).includes(l.code)}
                          onClick={() => toggleLanguage(l.code)}
                          disabled={isLocked}
                        >
                          {(form.languages || []).includes(l.code) ? "✓ " : ""}
                          {l.label}
                        </ChipButton>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            {/* Step 3 */}
            {step === 3 ? (
              <Section
                title={
                  <span>
                    {t("Compliance & Documents")} <Req ok={requiredOk.docs} />
                  </span>
                }
                sub={t("Upload required documents. Approval speed depends on document quality.")}
                lastSaved={lastSaved}
              >
                <div className="space-y-4">
                  <div className="card-mini">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t("Documents checklist")}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t("All document types are listed; required items are marked REQ.")}
                        </div>
                      </div>
                      <span className={`chip ${hasMissingRequiredDocs ? "chip-bad" : "chip-ok"}`}>
                        {hasMissingRequiredDocs ? "REQ" : "OK"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {docTypeRows.map((r) => (
                        <div
                          key={r.type}
                          className={`docRow ${r.ok ? "docOk" : r.required ? "docMiss" : ""}`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-black truncate">{t(r.type)}</div>
                            <div className="text-[11px] text-[var(--ev-subtle)]">
                              {r.ok ? t("Uploaded") : t("Missing")}
                              {r.expSoon ? ` • ${t("Expiring soon")}` : ""}
                              {r.hasExpired ? ` • ${t("Expired")}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`chip ${r.required ? (r.ok ? "chip-ok" : "chip-bad") : "chip-neutral"}`}>
                              {r.required ? (r.ok ? "OK" : "REQ") : "OPT"}
                            </span>
                            <span className="chip chip-neutral">{r.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {showDocsErrors && hasMissingRequiredDocs ? (
                      <div className="mt-3 text-xs font-semibold text-red-600">
                        {t("Upload all required documents marked REQ before continuing.")}
                      </div>
                    ) : null}
                  </div>

                  <DocsManager
                    docs={form.docs?.list || []}
                    locked={isLocked}
                    docTypes={DOC_TYPES}
                    requiredTypes={requiredDocTypes}
                    onAdd={(d) => setF({ docs: { list: [...(form.docs.list || []), d] } })}
                    onUpd={(i, patch) =>
                      setF({
                        docs: {
                          list: (form.docs.list || []).map((x, idx) =>
                            idx === i ? { ...x, ...patch } : x
                          ),
                        },
                      })
                    }
                    onDel={(i) =>
                      setF({
                        docs: {
                          list: (form.docs.list || []).filter((_, idx) => idx !== i),
                        },
                      })
                    }
                  />

                  <div className="flex items-center gap-2 text-xs text-[var(--ev-subtle)] flex-wrap">
                    <span>{t("Approval and admin review screens unlock after submission.")}</span>
                  </div>
                </div>
              </Section>
            ) : null}

            {/* Step 4 */}
            {step === 4 ? (
              <Section
                title={
                  <span>
                    {t("Shipping & Policies")} <Req ok={requiredOk.shipping} />
                  </span>
                }
                sub={t("Choose a default shipping profile and apply policy presets")}
                lastSaved={lastSaved}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={t("Default shipping profile")} required error={showShippingErrors ? shippingErrors.profileId : ""}>
                      <select
                        value={form.shipping?.profileId || ""}
                        onChange={(e) => setF({ shipping: { ...form.shipping, profileId: e.target.value } })}
                        className={`input w-full ${showShippingErrors && shippingErrors.profileId ? "input-error" : ""}`}
                        disabled={isLocked}
                      >
                        <option value="">{t("Select")}</option>
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.isDefault ? " • Default" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t("Starter shipping profiles are provisioned automatically. Detailed rate editing unlocks after onboarding approval.")}
                      </div>
                    </Field>

                    <div className="space-y-2">
                      <Field label={t("Handling time (business days)")} required error={showShippingErrors ? shippingErrors.handlingTimeDays : ""}>
                        <select
                          value={String(form.shipping?.handlingTimeDays ?? "")}
                          onChange={(e) => setF({ shipping: { ...form.shipping, handlingTimeDays: e.target.value } })}
                          className={`input w-full ${showShippingErrors && shippingErrors.handlingTimeDays ? "input-error" : ""}`}
                          disabled={isLocked}
                        >
                          {["0", "1", "2", "3", "4", "5", "7"].map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <label className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-[var(--ev-subtle)]">
                        <input
                          type="checkbox"
                          checked={!!form.shipping?.expressReady}
                          onChange={(e) =>
                            setF({ shipping: { ...form.shipping, expressReady: e.target.checked } })
                          }
                          disabled={isLocked}
                        />
                        {t("Ready for Express (same/next-day)")}
                      </label>
                    </div>
                  </div>

                  <Divider />

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t("Policy presets")}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t("Use a preset to quickly configure returns, warranty and handling time.")}
                        </div>
                      </div>
                      <span className="chip chip-neutral">{t("Quick setup")}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {lookups.policyPresets.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className="btn-ghost"
                          disabled={isLocked}
                          onClick={() => applyPolicyPreset(p.id)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label={t("Returns window (days)")}
                      required
                      error={showShippingErrors ? shippingErrors.returnsDays : ""}
                      helper={t("Use 0 for non-returnable categories")}
                    >
                      <input
                        value={String(form.policies?.returnsDays ?? "")}
                        onChange={(e) => setF({ policies: { ...form.policies, returnsDays: e.target.value } })}
                        placeholder={t("e.g. 7")}
                        className={`input w-full ${showShippingErrors && shippingErrors.returnsDays ? "input-error" : ""}`}
                        disabled={isLocked}
                      />
                    </Field>

                    <Field label={t("Warranty (days)")} helper={t("Use 0 if you do not provide warranty")}
                    >
                      <input
                        value={String(form.policies?.warrantyDays ?? "")}
                        onChange={(e) => setF({ policies: { ...form.policies, warrantyDays: e.target.value } })}
                        placeholder={t("e.g. 90")}
                        className="input w-full"
                        disabled={isLocked}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={t("Terms URL (optional)")}
                    >
                      <input
                        value={form.policies?.termsUrl || ""}
                        onChange={(e) => setF({ policies: { ...form.policies, termsUrl: e.target.value } })}
                        placeholder={t("https://.../terms")}
                        className="input w-full"
                        disabled={isLocked}
                      />
                    </Field>

                    <Field label={t("Privacy URL (optional)")}
                    >
                      <input
                        value={form.policies?.privacyUrl || ""}
                        onChange={(e) => setF({ policies: { ...form.policies, privacyUrl: e.target.value } })}
                        placeholder={t("https://.../privacy")}
                        className="input w-full"
                        disabled={isLocked}
                      />
                    </Field>
                  </div>

                  <Field
                    label={t("Policy notes (optional)")}
                    helper={t("Visible to admins during review. Keep it short.")}
                  >
                    <textarea
                      rows={2}
                      value={form.policies?.policyNotes || ""}
                      onChange={(e) => setF({ policies: { ...form.policies, policyNotes: e.target.value } })}
                      className="input w-full"
                      disabled={isLocked}
                      placeholder={t("Any category-specific return rules, shipping constraints, or warranty notes")}
                    />
                  </Field>

                  <div className="card-mini">
                    <div className="text-sm font-black">{t("Customer-facing preview")}</div>
                    <div className="mt-2 text-xs text-[var(--ev-subtle)]">{policyPreview}</div>
                  </div>
                </div>
              </Section>
            ) : null}

            {/* Step 5 */}
            {step === 5 ? (
              <Section
                title={
                  <span>
                    {t("Payout & Tax")} <Req ok={requiredOk.payout && requiredOk.tax} />
                  </span>
                }
                sub={t("Add payout method, currency, and tax details")}
                lastSaved={lastSaved}
              >
                <PayoutTaxStep
                  form={form}
                  setF={setF}
                  isLocked={isLocked}
                  lookups={lookups}
                  ownerContactName={ownerContactName}
                  ownerContactEmail={ownerContactEmail}
                  payoutErrors={payoutErrors}
                  taxErrors={taxErrors}
                  showPayoutErrors={showPayoutErrors}
                />
              </Section>
            ) : null}

            {/* Step 6 */}
            {step === 6 ? (
              <Section
                title={
                  <span>
                    {t("Review & Submit")} <Req ok={Object.values(requiredOk).every(Boolean)} />
                  </span>
                }
                sub={t("Confirm everything before submission")}
                lastSaved={lastSaved}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 text-sm">
                    <div className="card-mini">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t("Store")}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(1)}>
                          {t("Edit")}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t("Name")}: <b className="text-[var(--ev-text)]">{form.storeName || "N/A"}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t("Handle")}: <b className="text-[var(--ev-text)]">{form.storeSlug || "N/A"}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t("Email")}: <b className="text-[var(--ev-text)]">{form.email || "N/A"}</b>
                      </div>
                    </div>

                    <div className="card-mini">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t("Catalog")}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(2)}>
                          {t("Edit")}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t("Channels")}: <b className="text-[var(--ev-text)]">{(form.channels || []).join(", ") || "N/A"}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t("Categories")}: <b className="text-[var(--ev-text)]">{(form.taxonomySelections || []).length || 0}</b>
                      </div>
                    </div>

                    <div className="card-mini md:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t("Documents")}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(3)}>
                          {t("Edit")}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t("Uploaded")}: <b className="text-[var(--ev-text)]">{docsStats.total}</b>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {docTypeRows.map((r) => (
                          <div key={r.type} className={`docRow ${r.ok ? "docOk" : r.required ? "docMiss" : ""}`}>
                            <div className="min-w-0">
                              <div className="text-sm font-black truncate">{t(r.type)}</div>
                              <div className="text-[11px] text-[var(--ev-subtle)]">
                                {r.ok ? t("OK") : t("Missing")}
                              </div>
                            </div>
                            <span className={`chip ${r.required ? (r.ok ? "chip-ok" : "chip-bad") : "chip-neutral"}`}>
                              {r.required ? (r.ok ? "OK" : "REQ") : "OPT"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card-mini">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t("Shipping")}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(4)}>
                          {t("Edit")}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t("Profile")}: <b className="text-[var(--ev-text)]">{form.shipping?.profileId || "N/A"}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t("Handling")}: <b className="text-[var(--ev-text)]">{form.shipping?.handlingTimeDays ?? "N/A"}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t("Returns")}: <b className="text-[var(--ev-text)]">{form.policies?.returnsDays ?? "N/A"}</b>
                      </div>
                    </div>

                    <div className="card-mini">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t("Payout & Tax")}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(5)}>
                          {t("Edit")}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t("Payout")}: <b className="text-[var(--ev-text)]">{t(payoutMethodLabels[form.payout?.method] || "N/A")}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t("Currency")}: <b className="text-[var(--ev-text)]">{form.payout?.currency || "N/A"}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t("Tax ID")}: <b className="text-[var(--ev-text)]">{form.tax?.taxId || "N/A"}</b>
                      </div>
                    </div>
                  </div>

                  <div className="card-mini">
                    <div className="text-sm font-black">{t("Agreements")}</div>
                    <div className="mt-2 space-y-2 text-sm">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!form.acceptance?.sellerTerms}
                          disabled={isLocked}
                          onChange={(e) =>
                            setF({ acceptance: { ...form.acceptance, sellerTerms: e.target.checked } })
                          }
                        />
                        <span className="text-xs text-[var(--ev-subtle)]">
                          {t('I agree to the "EVzone Seller Terms" and payout terms.')}
                          {showLegalErrors && legalErrors.sellerTerms ? (
                            <span className="ml-2 text-[11px] font-bold text-red-600">
                              {legalErrors.sellerTerms}
                            </span>
                          ) : null}
                        </span>
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!form.acceptance?.contentPolicy}
                          disabled={isLocked}
                          onChange={(e) =>
                            setF({ acceptance: { ...form.acceptance, contentPolicy: e.target.checked } })
                          }
                        />
                        <span className="text-xs text-[var(--ev-subtle)]">
                          {t('I agree to the "Content & Listing Policy" (accurate listings, no prohibited items).')}
                          {showLegalErrors && legalErrors.contentPolicy ? (
                            <span className="ml-2 text-[11px] font-bold text-red-600">
                              {legalErrors.contentPolicy}
                            </span>
                          ) : null}
                        </span>
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!form.acceptance?.dataProcessing}
                          disabled={isLocked}
                          onChange={(e) =>
                            setF({ acceptance: { ...form.acceptance, dataProcessing: e.target.checked } })
                          }
                        />
                        <span className="text-xs text-[var(--ev-subtle)]">
                          {t('I agree to "Data Processing" for verification, fraud prevention and payouts.')}
                          {showLegalErrors && legalErrors.dataProcessing ? (
                            <span className="ml-2 text-[11px] font-bold text-red-600">
                              {legalErrors.dataProcessing}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </div>

                    {!requiredOk.legal ? (
                      <div className="mt-3 text-xs font-bold text-red-600">
                        {t("All agreements must be accepted before submission.")}
                      </div>
                    ) : null}
                  </div>

                  <div className="footerNav">
                    <button type="button" className="btn-outline-orange" onClick={() => goStep(5)}>
                      {t("Back")}
                    </button>
                    <div className="flex items-center gap-2">
                      <span
                        className={`chip ${Object.values(requiredOk).every(Boolean) ? "chip-ok" : "chip-bad"
                          }`}
                      >
                        {Object.values(requiredOk).every(Boolean) ? t("Ready to submit") : t("Not ready")}
                      </span>
                      <button
                        type="button"
                        onClick={submit}
                        className="btn-primary"
                        disabled={form.status !== "DRAFT"}
                      >
                        {t("Submit")}
                      </button>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            {/* Footer navigation */}
            <div className="footerNav">
              <button
                type="button"
                onClick={() => goStep(step - 1)}
                className="btn-outline-orange"
                disabled={step === 1}
              >
                {t("Back")}
              </button>

              {step < 6 ? (
                <button type="button" onClick={() => goStep(step + 1)} className="btn-primary">
                  {t("Next")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  className="btn-primary"
                  disabled={form.status !== "DRAFT"}
                >
                  {t("Submit")}
                </button>
              )}
            </div>
          </section>

          {/* Aside */}
          <aside className="space-y-4">
            <div className="card-mini">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-black">{t("Checklist")}</div>
                <span className="chip chip-neutral">{completion}%</span>
              </div>

              <ul className="mt-3 space-y-2 text-xs">
                {steps.slice(0, 6).map((s) => (
                  <li key={`chk-${s.key}`} className="flex items-center justify-between gap-2">
                    <button type="button" className="underline font-bold" onClick={() => goStep(s.n)}>
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
                  {t("Complete all required items to submit.")}
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
              <div className="text-sm font-black">{t("After submission")}</div>
              <ol className="mt-2 list-decimal pl-5 space-y-1 text-xs text-[var(--ev-subtle)]">
                <li>{t("Our team reviews your profile and documents.")}</li>
                <li>{t("We may request clarifications before approval.")}</li>
                <li>{t("Once approved, listings, promos, wholesale and payouts unlock.")}</li>
              </ol>
              <div className="mt-3 text-xs">
                {t("Approval tracking unlocks after submission.")}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PayoutTaxStep({
  form,
  setF,
  isLocked,
  lookups,
  ownerContactName,
  ownerContactEmail,
  payoutErrors,
  taxErrors,
  showPayoutErrors,
}) {
  const { t } = useLocalization();
  const payout = form.payout || {};
  const tax = form.tax || {};

  const updatePayout = (patch) =>
    setF((prev) => ({
      payout: { ...(prev.payout || {}), ...patch },
    }));
  const updateTax = (patch) =>
    setF((prev) => ({
      tax: { ...(prev.tax || {}), ...patch },
    }));

  const handleMethodChange = (value) => {
    if (isLocked) return;
    updatePayout({ method: value });
  };

  const payoutUsesAccount = (method) => ["bank_account", "alipay", "wechat_pay"].includes(method);

  const renderAccountFields = () => {
    switch (payout.method) {
      case "bank_account":
        return (
          <Stack spacing={2}>
            <TextField
              label={t("Account holder name")}
              fullWidth
              size="small"
              value={payout.accountName}
              onChange={(e) => updatePayout({ accountName: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.accountName}
              helperText={showPayoutErrors && payoutErrors.accountName ? payoutErrors.accountName : ""}
            />
            <TextField
              label={t("Bank country")}
              fullWidth
              size="small"
              value={payout.bankCountry}
              onChange={(e) => updatePayout({ bankCountry: e.target.value })}
              placeholder={t("e.g. Uganda, Kenya, China")}
              disabled={isLocked}
            />
            <Stack direction="column" spacing={2}>
              <TextField
                label={t("Bank name")}
                fullWidth
                size="small"
                value={payout.bankName}
                onChange={(e) => updatePayout({ bankName: e.target.value })}
                disabled={isLocked}
                error={showPayoutErrors && !!payoutErrors.bankName}
                helperText={showPayoutErrors && payoutErrors.bankName ? payoutErrors.bankName : ""}
              />
              <TextField
                label={t("Branch")}
                fullWidth
                size="small"
                value={payout.bankBranch}
                onChange={(e) => updatePayout({ bankBranch: e.target.value })}
                disabled={isLocked}
              />
            </Stack>
            <Stack direction="column" spacing={2}>
              <TextField
                label={t("Account number / IBAN")}
                fullWidth
                size="small"
                value={payout.accountNo}
                onChange={(e) => updatePayout({ accountNo: e.target.value })}
                disabled={isLocked}
                error={showPayoutErrors && !!payoutErrors.accountNo}
                helperText={showPayoutErrors && payoutErrors.accountNo ? payoutErrors.accountNo : ""}
              />
              <TextField
                label={t("SWIFT / BIC (optional)")}
                fullWidth
                size="small"
                value={payout.swiftBic}
                onChange={(e) => updatePayout({ swiftBic: e.target.value })}
                disabled={isLocked}
              />
            </Stack>
          </Stack>
        );

      case "mobile_money":
        return (
          <Stack spacing={2}>
            <TextField
              label={t("Account holder name")}
              fullWidth
              size="small"
              value={payout.accountName}
              onChange={(e) => updatePayout({ accountName: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.accountName}
              helperText={showPayoutErrors && payoutErrors.accountName ? payoutErrors.accountName : ""}
            />
            <Stack direction="column" spacing={2}>
              <TextField
                label={t("Wallet provider")}
                select
                fullWidth
                size="small"
                value={payout.mobileProvider}
                onChange={(e) => updatePayout({ mobileProvider: e.target.value })}
                disabled={isLocked}
                error={showPayoutErrors && !!payoutErrors.mobileProvider}
                helperText={showPayoutErrors && payoutErrors.mobileProvider ? payoutErrors.mobileProvider : ""}
              >
                <MenuItem value="">{t("Select wallet provider")}</MenuItem>
                {lookups.mobileMoneyProviders.map((provider) => (
                  <MenuItem key={provider.value} value={provider.value}>
                    {t(provider.label)}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Box sx={{ minWidth: 180, width: "100%" }}>
                  <CountryCodeAutocomplete
                    value={payout.mobileCountryCode}
                    onChange={(nextCode) => updatePayout({ mobileCountryCode: nextCode })}
                    disabled={isLocked}
                  />
                </Box>
                <TextField
                  label={t("Wallet / mobile number")}
                  fullWidth
                  size="small"
                  value={payout.mobileNo}
                  onChange={(e) => updatePayout({ mobileNo: e.target.value })}
                  placeholder={t("Do not include leading zeros or spaces")}
                  disabled={isLocked}
                  error={showPayoutErrors && !!payoutErrors.mobileNo}
                  helperText={showPayoutErrors && payoutErrors.mobileNo ? payoutErrors.mobileNo : ""}
                />
              </Stack>
            </Stack>
            <Stack direction="column" spacing={2}>
              <TextField
                label={t("ID type (for KYC)")}
                select
                fullWidth
                size="small"
                value={payout.mobileIdType}
                onChange={(e) => updatePayout({ mobileIdType: e.target.value })}
                disabled={isLocked}
              >
                <MenuItem value="">{t("Select ID type")}</MenuItem>
                {lookups.mobileIdTypes.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {t(item.label)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("ID number")}
                fullWidth
                size="small"
                value={payout.mobileIdNumber}
                onChange={(e) => updatePayout({ mobileIdNumber: e.target.value })}
                disabled={isLocked}
              />
            </Stack>
          </Stack>
        );

      case "alipay":
        return (
          <Stack spacing={2}>
            <TextField
              label={t("Account holder name")}
              fullWidth
              size="small"
              value={payout.accountName}
              onChange={(e) => updatePayout({ accountName: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.accountName}
              helperText={showPayoutErrors && payoutErrors.accountName ? payoutErrors.accountName : ""}
            />
            <TextField
              select
              label={t("Alipay region")}
              fullWidth
              size="small"
              value={payout.alipayRegion}
              onChange={(e) => updatePayout({ alipayRegion: e.target.value })}
              disabled={isLocked}
            >
              {lookups.payoutRegions.alipay.map((region) => (
                <MenuItem key={region.value} value={region.value}>
                  {t(region.label)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t("Alipay login (phone or email)")}
              fullWidth
              size="small"
              value={payout.alipayLogin}
              onChange={(e) => updatePayout({ alipayLogin: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.alipayLogin}
              helperText={showPayoutErrors && payoutErrors.alipayLogin ? payoutErrors.alipayLogin : ""}
            />
            <TextField
              label={t("Alipay account ID (optional)")}
              fullWidth
              size="small"
              value={payout.accountNo}
              onChange={(e) => updatePayout({ accountNo: e.target.value })}
              disabled={isLocked}
            />
          </Stack>
        );

      case "wechat_pay":
        return (
          <Stack spacing={2}>
            <TextField
              label={t("Account holder name")}
              fullWidth
              size="small"
              value={payout.accountName}
              onChange={(e) => updatePayout({ accountName: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.accountName}
              helperText={showPayoutErrors && payoutErrors.accountName ? payoutErrors.accountName : ""}
            />
            <TextField
              select
              label={t("WeChat region")}
              fullWidth
              size="small"
              value={payout.wechatRegion}
              onChange={(e) => updatePayout({ wechatRegion: e.target.value })}
              disabled={isLocked}
            >
              {lookups.payoutRegions.wechat.map((region) => (
                <MenuItem key={region.value} value={region.value}>
                  {t(region.label)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t("WeChat ID")}
              fullWidth
              size="small"
              value={payout.wechatId}
              onChange={(e) => updatePayout({ wechatId: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.wechatId}
              helperText={showPayoutErrors && payoutErrors.wechatId ? payoutErrors.wechatId : ""}
            />
            {(() => {
              const wechatPhoneParts = splitPhoneNumber(payout.accountNo);
              const wechatPhoneError = showPayoutErrors && payoutErrors.accountNo;
              return (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Box sx={{ minWidth: 180, width: "100%" }}>
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
                    label={t("Linked phone number")}
                    fullWidth
                    size="small"
                    value={wechatPhoneParts.number}
                    onChange={(e) =>
                      updatePayout({
                        accountNo: combinePhoneNumber(wechatPhoneParts.code, e.target.value),
                      })
                    }
                    disabled={isLocked}
                    placeholder={t("700 000 000")}
                    error={!!wechatPhoneError}
                    helperText={wechatPhoneError ? payoutErrors.accountNo : ""}
                  />
                </Stack>
              );
            })()}
          </Stack>
        );

      case "other_local":
      default:
        return (
          <Stack spacing={2}>
            <TextField
              label={t("Payout method name")}
              fullWidth
              size="small"
              value={payout.otherMethod}
              onChange={(e) => updatePayout({ otherMethod: e.target.value })}
              placeholder={t("e.g. Payoneer, Flutterwave, local wallet")}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.otherMethod}
              helperText={showPayoutErrors && payoutErrors.otherMethod ? payoutErrors.otherMethod : ""}
            />
            <TextField
              label={t("Provider / bank")}
              fullWidth
              size="small"
              value={payout.otherProvider}
              onChange={(e) => updatePayout({ otherProvider: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.otherProvider}
              helperText={showPayoutErrors && payoutErrors.otherProvider ? payoutErrors.otherProvider : ""}
            />
            <TextField
              label={t("Country or region")}
              fullWidth
              size="small"
              value={payout.otherCountry}
              onChange={(e) => updatePayout({ otherCountry: e.target.value })}
              disabled={isLocked}
            />
            <TextField
              label={t("Account or reference ID")}
              fullWidth
              size="small"
              value={payout.accountNo}
              onChange={(e) => updatePayout({ accountNo: e.target.value })}
              disabled={isLocked}
            />
            <TextField
              label={t("Additional payout instructions (optional)")}
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
              {t("Payout method")}
            </Typography>
            <IconShield />
          </Box>
          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2 }}>
            {t("Choose how you would like to receive payouts from EVzone sales, services and tips.")}
          </Typography>

          <Stack spacing={1.2}>
            {lookups.payoutMethods.map((method) => {
              const selected = payout.method === method.value;
              return (
                <Paper
                  key={method.value}
                  onClick={() => handleMethodChange(method.value)}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: selected ? `2px solid ${EV_COLORS.primary}` : `1px solid ${EV_COLORS.border}`,
                    backgroundColor: selected ? EV_COLORS.primarySoft : EV_COLORS.surfaceAlt,
                    cursor: isLocked ? "not-allowed" : "pointer",
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
                    {PAYOUT_METHOD_ICONS[method.value] || <IconWallet />}
                    <Box className="flex flex-col flex-1 min-w-0">
                      <Typography variant="body2" sx={{ color: EV_COLORS.textMain, fontWeight: selected ? 800 : 600 }}>
                        {t(method.label)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: EV_COLORS.textSubtle,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {t(method.helper || "")}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 1, fontWeight: 700 }}>
            {t("Payout currency")}
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            placeholder={t("Choose currency")}
            value={payout.currency}
            onChange={(e) => updatePayout({ currency: e.target.value })}
            disabled={isLocked}
            error={showPayoutErrors && !!payoutErrors.currency}
            helperText={showPayoutErrors && payoutErrors.currency ? payoutErrors.currency : ""}
          >
            <MenuItem value="">
              <em>{t("Choose currency")}</em>
            </MenuItem>
            {lookups.payoutCurrencies.map((cur) => (
              <MenuItem key={cur} value={cur}>
                {cur}
              </MenuItem>
            ))}
          </TextField>

          <Box className="flex items-center gap-1 mt-2">
            <IconGlobe />
            <Typography variant="caption" sx={{ color: EV_COLORS.textMuted }}>
              {t("We may convert to your bank's settlement currency where required by your region.")}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 1, fontWeight: 700 }}>
            {t("Payout notifications")}
          </Typography>
          <Stack spacing={1.6}>
            <TextField
              label={t("Notification email")}
              fullWidth
              size="small"
              value={payout.notificationsEmail}
              onChange={(e) => updatePayout({ notificationsEmail: e.target.value })}
              disabled={isLocked}
              placeholder={ownerContactEmail || ""}
            />
            {(() => {
              const notifWhatsAppParts = splitPhoneNumber(payout.notificationsWhatsApp);
              return (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Box sx={{ minWidth: 180, width: "100%" }}>
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
                    label={t("Notification WhatsApp (optional)")}
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
                    placeholder={t("700 000 000")}
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
          <Typography variant="subtitle1" sx={{ color: EV_COLORS.textMain, fontWeight: 800, mb: 1 }}>
            {t("Account details")}
          </Typography>

          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2 }}>
            {t("Provide payout account information for the selected payout method.")}
          </Typography>

          <Stack spacing={2}>{renderAccountFields()}</Stack>

          <Box className="mt-3">
            <FormControlLabel
              control={
                <Checkbox
                  checked={payout.confirmDetails}
                  onChange={(e) => updatePayout({ confirmDetails: e.target.checked })}
                  size="small"
                  disabled={isLocked}
                />
              }
              label={
                <Typography variant="caption" sx={{ color: EV_COLORS.textSubtle, fontWeight: 700 }}>
                  {t("I confirm that the payout details provided are correct.")}
                </Typography>
              }
            />
            {showPayoutErrors && payoutErrors.confirmDetails ? (
              <Typography variant="caption" sx={{ color: "#b91c1c", fontWeight: 700 }}>
                {payoutErrors.confirmDetails}
              </Typography>
            ) : null}
          </Box>

          {payoutUsesAccount(payout.method) ? (
            <Typography variant="caption" sx={{ color: EV_COLORS.textMuted }}>
              {t("Tip: Use the exact account holder name to reduce payout failures.")}
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
            {t("Payout rhythm")}
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
            {t("Optional")}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2, maxWidth: 720 }}>
          {t("Payouts are grouped by settlement schedule. Depending on your region, you may receive payouts daily, weekly, monthly or by threshold.")}
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-start" }}>
          {lookups.payoutRhythms.map((rhythm) => {
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
                  border: selected ? `2px solid ${EV_COLORS.primary}` : `1px solid ${EV_COLORS.border}`,
                  backgroundColor: selected ? EV_COLORS.primarySoft : EV_COLORS.surfaceAlt,
                  cursor: isLocked ? "not-allowed" : "pointer",
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
                  <Typography variant="body2" sx={{ color: EV_COLORS.textMain, fontWeight: selected ? 800 : 600 }}>
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

        {payout.rhythm === "on_threshold" ? (
          <Box className="mt-3" sx={{ maxWidth: 420 }}>
            <TextField
              label={t("Threshold amount")}
              fullWidth
              size="small"
              value={payout.thresholdAmount || ""}
              onChange={(e) => updatePayout({ thresholdAmount: e.target.value })}
              disabled={isLocked}
              placeholder={t("e.g. 100")}
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
            {t("Tax information")}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2, maxWidth: 760 }}>
          {t("We use these details for invoicing, reporting and to comply with local tax regulations.")}
        </Typography>

        <Stack spacing={2}>
          <TextField
            select
            label={t("Seller type")}
            fullWidth
            size="small"
            value={tax.taxpayerType || "business"}
            onChange={(e) => updateTax({ taxpayerType: e.target.value })}
            disabled={isLocked}
          >
            <MenuItem value="business">{t("Business / company")}</MenuItem>
            <MenuItem value="individual">{t("Individual")}</MenuItem>
          </TextField>

          <TextField
            label={t("Legal name (as on tax registration)")}
            fullWidth
            size="small"
            value={tax.legalName}
            onChange={(e) => updateTax({ legalName: e.target.value })}
            disabled={isLocked}
            error={showPayoutErrors && !!taxErrors.legalName}
            helperText={showPayoutErrors && taxErrors.legalName ? taxErrors.legalName : ""}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label={t("Tax country / region")}
              fullWidth
              size="small"
              value={tax.taxCountry}
              onChange={(e) => updateTax({ taxCountry: e.target.value })}
              placeholder={t("e.g. Uganda, Kenya, China")}
              disabled={isLocked}
              error={showPayoutErrors && !!taxErrors.taxCountry}
              helperText={showPayoutErrors && taxErrors.taxCountry ? taxErrors.taxCountry : ""}
            />
            <TextField
              label={t("Tax ID / TIN")}
              fullWidth
              size="small"
              value={tax.taxId}
              onChange={(e) => updateTax({ taxId: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!taxErrors.taxId}
              helperText={showPayoutErrors && taxErrors.taxId ? taxErrors.taxId : ""}
            />
          </Stack>

          <TextField
            label={t("VAT / GST number (optional)")}
            fullWidth
            size="small"
            value={tax.vatNumber}
            onChange={(e) => updateTax({ vatNumber: e.target.value })}
            disabled={isLocked}
          />

          <TextField
            label={t("Legal address")}
            fullWidth
            size="small"
            value={tax.legalAddress}
            onChange={(e) => updateTax({ legalAddress: e.target.value })}
            disabled={isLocked}
            placeholder={t("Street, city, country")}
          />

          <Divider />

          <Box className="flex items-center justify-between gap-2">
            <Typography variant="subtitle2" sx={{ color: EV_COLORS.textMain, fontWeight: 800 }}>
              {t("Tax contact")}
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
                  {t("Same as owner")}
                </Typography>
              }
            />
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label={t("Contact person")}
              fullWidth
              size="small"
              value={tax.contact}
              onChange={(e) => updateTax({ contact: e.target.value })}
              disabled={isLocked || !!tax.contactSameAsOwner}
              placeholder={ownerContactName || ""}
            />
            <TextField
              label={t("Contact email")}
              fullWidth
              size="small"
              value={tax.contactEmail}
              onChange={(e) => updateTax({ contactEmail: e.target.value })}
              disabled={isLocked || !!tax.contactSameAsOwner}
              placeholder={ownerContactEmail || ""}
              error={showPayoutErrors && !!taxErrors.contactEmail}
              helperText={showPayoutErrors && taxErrors.contactEmail ? taxErrors.contactEmail : ""}
            />
          </Stack>

          <Typography variant="caption" sx={{ color: EV_COLORS.textMuted, mt: 0.5 }}>
            {t("By continuing, you confirm that the information provided here is accurate and up to date.")}
          </Typography>
        </Stack>
      </Paper>
    </div>
  );
}

type DocsManagerProps = {
  docs: DocItem[];
  onAdd: (doc: DocItem) => void;
  onUpd: (idx: number, patch: Partial<DocItem>) => void;
  onDel: (idx: number) => void;
  locked?: boolean;
  docTypes?: string[];
  requiredTypes?: string[];
};

function DocsManager({
  docs,
  onAdd,
  onUpd,
  onDel,
  locked,
  docTypes = DOC_TYPES,
  requiredTypes = [],
}: DocsManagerProps) {
  const { t } = useLocalization();

  const [type, setType] = useState(docTypes[0] || "Business Registration");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [docError, setDocError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dzRef = useRef<HTMLDivElement | null>(null);

  const allow = useCallback((f: File) => {
    const okType =
      f.type.startsWith("image/") ||
      f.type === "application/pdf" ||
      /\.(doc|docx)$/i.test(f.name);
    const okSize = f.size <= MAX_FILE_SIZE;
    return okType && okSize ? null : !okType ? "Unsupported type" : "Too large";
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      const arr = Array.from(fileList || []) as File[];
      let errorMsg = "";
      arr.forEach((f) => {
        const err = allow(f);
        if (err) {
          errorMsg = `File "${f.name}" skipped: ${err}`;
          return;
        }
        const id = "DOC-" + (1000 + (docs.length || 0) + Math.floor(Math.random() * 999));
        onAdd({
          id,
          type,
          name: name || f.name,
          file: f.name,
          fileUrl: URL.createObjectURL(f),
          status: "Uploaded",
          expiry,
        });
      });
      setName("");
      setExpiry("");
      setDocError(errorMsg);
    },
    [allow, docs.length, expiry, name, onAdd, type]
  );

  useEffect(() => {
    const el = dzRef.current;
    if (!el) return;
    const over = (e) => {
      e.preventDefault();
      el.classList.add("drag");
    };
    const leave = (e) => {
      e.preventDefault();
      el.classList.remove("drag");
    };
    const drop = (e) => {
      e.preventDefault();
      el.classList.remove("drag");
      const files = e.dataTransfer?.files;
      if (files) handleFiles(files);
    };
    el.addEventListener("dragover", over);
    el.addEventListener("dragleave", leave);
    el.addEventListener("drop", drop);
    return () => {
      el.removeEventListener("dragover", over);
      el.removeEventListener("dragleave", leave);
      el.removeEventListener("drop", drop);
    };
  }, [handleFiles]);

  const isMissingType = (docType) => {
    if (!requiredTypes.includes(docType)) return false;
    const matches = (docs || []).filter((d) => String(d?.type || "").trim() === docType);
    return matches.length === 0 || matches.every((d) => isExpired(d?.expiry));
  };

  const deleteWithRevoke = (idx) => {
    const d = docs[idx];
    if (d?.fileUrl && typeof d.fileUrl === "string" && d.fileUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(d.fileUrl);
      } catch {
        // ignore
      }
    }
    onDel(idx);
  };

  return (
    <div
      className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
      style={{ borderColor: "rgba(203,213,225,.65)", background: "rgba(255,255,255,.90)" }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-black">{t("Upload documents")}</div>
          <div className="text-xs text-gray-600 mt-0.5">
            {t("Accepted: PDF, images, DOC/DOCX. Max size 25MB per file.")}
          </div>
        </div>
        <div className="text-xs text-gray-600">
          {requiredTypes.length ? (
            <span className="font-bold">{t("Required types")}: {requiredTypes.length}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5 text-sm">
        <div className="sm:col-span-2">
          <div className="text-xs text-gray-600">{t("Document name")}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            disabled={locked}
            placeholder={t("Optional (defaults to filename)")}
          />
        </div>

        <div>
          <div className="text-xs text-gray-600">{t("Type")}</div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`input w-full ${isMissingType(type) ? "border-red-300" : ""}`}
            disabled={locked}
          >
            {docTypes.map((x) => (
              <option key={x} value={x}>
                {x}{requiredTypes.includes(x) ? " *" : ""}
              </option>
            ))}
          </select>
          {isMissingType(type) ? (
            <div className="text-[11px] font-bold text-red-600 mt-1">{t("This type is required")}</div>
          ) : null}
        </div>

        <div>
          <div className="text-xs text-gray-600">{t("Expiry")}</div>
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="input w-full"
            disabled={locked}
          />
        </div>

        <div>
          <div className="text-xs text-gray-600">{t("Upload files")}</div>
          <div
            ref={dzRef}
            className="dz dz-compact"
            aria-label={t("Upload area")}
            style={{
              border: "1.5px dashed rgba(3,205,140,.35)",
              borderRadius: 18,
              padding: "10px 12px",
              background: "linear-gradient(135deg, rgba(3,205,140,.06), rgba(255,255,255,.90))",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ background: "rgba(3,205,140,.12)", color: "#047857" }}
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 16V4" />
                    <path d="M7 9l5-5 5 5" />
                    <path d="M4 20h16" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{t("Drag and drop")}</div>
                  <div className="text-[11px] text-gray-600 truncate">{t("or browse files")}</div>
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
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="btn-primary"
                  disabled={locked}
                >
                  {t("Browse")}
                </button>
              </div>
            </div>
            {docError ? <div className="text-[11px] font-bold text-red-600 mt-2">{docError}</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F2F2F2] text-gray-700 dark:text-slate-300">
            <tr className="text-left">
              <th className="px-3 py-2">{t("Name")}</th>
              <th className="px-3 py-2">{t("Type")}</th>
              <th className="px-3 py-2">{t("File")}</th>
              <th className="px-3 py-2">{t("Expiry")}</th>
              <th className="px-3 py-2">{t("Status")}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(docs || []).map((d, i) => {
              const expired = isExpired(d.expiry);
              const soon = isExpiringSoon(d.expiry, 30);
              const status = d.status || "Uploaded";

              const chipCls =
                status === "Verified"
                  ? "chip chip-ok"
                  : status === "Submitted"
                    ? "chip chip-info"
                    : status === "Rejected"
                      ? "chip chip-bad"
                      : expired
                        ? "chip chip-bad"
                        : soon
                          ? "chip chip-neutral"
                          : "chip chip-neutral";

              return (
                <tr key={d.id || i} className={i % 2 ? "bg-white dark:bg-slate-900" : "bg-[#fcfcfc]"}>
                  <td className="px-3 py-2">
                    <div className="font-bold text-[var(--ev-text)]">{d.name}</div>
                    {requiredTypes.includes(d.type) ? (
                      <div className="text-[11px] text-[var(--ev-orange)] font-bold">{t("Required")}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={d.type}
                      onChange={(e) => onUpd(i, { type: e.target.value })}
                      className={`input w-60 ${isMissingType(d.type) ? "border-red-300" : ""}`}
                      disabled={locked}
                    >
                      {docTypes.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-700 dark:text-slate-300">{d.file || "N/A"}</span>
                      {d.fileUrl ? (
                        <a className="underline text-xs font-bold" href={d.fileUrl} target="_blank" rel="noreferrer">
                          {t("View")}
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={d.expiry || ""}
                      onChange={(e) => onUpd(i, { expiry: e.target.value })}
                      className="input w-40"
                      disabled={locked}
                    />
                    {expired ? <div className="text-[11px] font-bold text-red-600 mt-1">{t("Expired")}</div> : null}
                    {!expired && soon ? (
                      <div className="text-[11px] font-bold text-amber-700 mt-1">{t("Expiring soon")}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <span className={chipCls}>{status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <select
                        value={status}
                        onChange={(e) => onUpd(i, { status: e.target.value })}
                        className="input w-36"
                        disabled={locked}
                      >
                        {["Uploaded", "Submitted", "Verified", "Rejected"].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => deleteWithRevoke(i)} className="btn-ghost" disabled={locked}>
                        {t("Delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {(docs || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                  {t("No documents yet.")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
