type SellerRecord = {
  id: string;
  userId: string | null;
  handle: string | null;
  name: string;
  displayName: string;
  legalBusinessName: string | null;
  storefrontName: string | null;
  type: string;
  kind: string;
  category: string | null;
  categories: string | null;
  region: string | null;
  description: string | null;
  languages: string | null;
  rating: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function parseJsonArray(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializePublicSeller(profile: SellerRecord) {
  return serializePublicSellerWithExtras(profile);
}

export function serializePublicSellerWithExtras(
  profile: SellerRecord,
  extras?: {
    website?: string | null;
    policies?: {
      termsUrl?: string | null;
      privacyUrl?: string | null;
    } | null;
    capabilities?: {
      quotes: boolean;
      bookings: boolean;
      consultations: boolean;
    } | null;
    providerServices?: string[];
    bookingModes?: string[];
  }
) {
  const hasProviderRequestActions =
    String(profile.kind || '').toUpperCase() === 'PROVIDER' && Boolean(profile.handle) && Boolean(extras?.capabilities);
  return {
    id: profile.id,
    handle: profile.handle,
    name: profile.name,
    displayName: profile.displayName,
    storefrontName: profile.storefrontName,
    type: profile.type,
    kind: profile.kind,
    category: profile.category,
    categories: parseJsonArray(profile.categories),
    region: profile.region,
    description: profile.description,
    languages: parseJsonArray(profile.languages),
    website: extras?.website ?? null,
    policies: {
      termsUrl: extras?.policies?.termsUrl ?? null,
      privacyUrl: extras?.policies?.privacyUrl ?? null
    },
    capabilities: extras?.capabilities ?? null,
    providerServices: Array.isArray(extras?.providerServices) ? extras?.providerServices : [],
    bookingModes: Array.isArray(extras?.bookingModes) ? extras?.bookingModes : [],
    requestActions: hasProviderRequestActions
      ? {
          booking: {
            enabled: Boolean(extras?.capabilities?.bookings),
            method: 'POST',
            path: '/api/provider/bookings',
            providerHandle: `@${profile.handle}`
          },
          consultation: {
            enabled: Boolean(extras?.capabilities?.consultations),
            method: 'POST',
            path: '/api/provider/consultations',
            providerHandle: `@${profile.handle}`
          }
        }
      : null,
    rating: profile.rating,
    isVerified: profile.isVerified,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

export function serializePrivateSeller(profile: SellerRecord) {
  return {
    ...profile,
    categories: parseJsonArray(profile.categories),
    languages: parseJsonArray(profile.languages)
  };
}
