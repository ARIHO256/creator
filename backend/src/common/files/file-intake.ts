import { BadRequestException } from '@nestjs/common';

const MB = 1024 * 1024;

const KIND_MIME_PREFIXES: Record<string, string[]> = {
  image: ['image/'],
  video: ['video/'],
  audio: ['audio/'],
  document: ['application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument'],
  archive: ['application/zip', 'application/x-', 'multipart/x-zip'],
  spreadsheet: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml'],
  presentation: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml'],
  design: ['application/postscript', 'application/illustrator', 'image/vnd.adobe.photoshop'],
  code: ['text/', 'application/json', 'application/xml', 'application/javascript'],
  other: []
};

const KIND_SIZE_LIMITS: Record<string, number> = {
  image: 20 * MB,
  video: 500 * MB,
  audio: 100 * MB,
  document: 25 * MB,
  archive: 100 * MB,
  spreadsheet: 25 * MB,
  presentation: 50 * MB,
  design: 250 * MB,
  code: 10 * MB,
  other: 100 * MB
};

const STORAGE_PROVIDERS = ['LOCAL', 'S3', 'CLOUDFLARE_R2', 'GCS', 'AZURE_BLOB', 'EXTERNAL'] as const;
const VISIBILITIES = ['PRIVATE', 'INTERNAL', 'PUBLIC'] as const;

export type FileIntakeInput = {
  name: string;
  kind?: string;
  mimeType?: string;
  sizeBytes?: number;
  extension?: string;
  checksum?: string;
  storageProvider?: string;
  storageKey?: string;
  url?: string;
  visibility?: string;
  metadata?: Record<string, unknown>;
};

export type NormalizedFileIntake = {
  name: string;
  kind: string;
  mimeType: string | null;
  sizeBytes: number | null;
  extension: string | null;
  checksum: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  url: string | null;
  visibility: string;
  metadata: Record<string, unknown> | null;
};

export function normalizeFileIntake(
  input: FileIntakeInput,
  options: { requireLocator?: boolean; defaultKind?: string } = {}
): NormalizedFileIntake {
  const name = String(input.name || '').trim();
  if (!name) {
    throw new BadRequestException('File name is required');
  }

  const mimeType = input.mimeType ? String(input.mimeType).trim().toLowerCase() : null;
  const inferredKind = mimeType ? inferKindFromMimeType(mimeType) : null;
  const kind = normalizeKind(input.kind ?? inferredKind ?? options.defaultKind ?? 'other');
  const sizeBytes = normalizeSize(input.sizeBytes, kind);
  const extension = input.extension ? normalizeExtension(input.extension) : inferExtension(name);
  const checksum = input.checksum ? String(input.checksum).trim().toLowerCase() : null;
  const storageKey = input.storageKey ? String(input.storageKey).trim() : null;
  const url = input.url ? String(input.url).trim() : null;
  const storageProvider = normalizeStorageProvider(input.storageProvider, storageKey, url);
  const visibility = normalizeVisibility(input.visibility);

  if (options.requireLocator !== false && !storageKey && !url) {
    throw new BadRequestException('File requires either a url or storageKey');
  }

  if (mimeType && !isMimeAllowedForKind(kind, mimeType)) {
    throw new BadRequestException(`mimeType "${mimeType}" is not allowed for kind "${kind}"`);
  }

  return {
    name,
    kind,
    mimeType,
    sizeBytes,
    extension,
    checksum,
    storageProvider,
    storageKey,
    url,
    visibility,
    metadata: input.metadata ?? null
  };
}

function normalizeKind(value: string) {
  const kind = String(value || 'other').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(KIND_MIME_PREFIXES, kind) ? kind : 'other';
}

function normalizeSize(value: number | undefined, kind: string) {
  if (value === undefined || value === null) {
    return null;
  }

  const sizeBytes = Number(value);
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new BadRequestException('sizeBytes must be a positive integer');
  }

  const limit = KIND_SIZE_LIMITS[kind] ?? KIND_SIZE_LIMITS.other;
  if (sizeBytes > limit) {
    throw new BadRequestException(`sizeBytes exceeds limit for kind "${kind}"`);
  }

  return sizeBytes;
}

function normalizeExtension(value: string) {
  const extension = String(value).trim().toLowerCase().replace(/^\./, '');
  return extension || null;
}

function inferExtension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]{1,12})$/);
  return match ? match[1] : null;
}

function normalizeStorageProvider(value: string | undefined, storageKey: string | null, url: string | null) {
  if (!value) {
    if (storageKey) {
      return 'LOCAL';
    }
    if (url) {
      return 'EXTERNAL';
    }
    return null;
  }

  const provider = String(value).trim().toUpperCase();
  if (!STORAGE_PROVIDERS.includes(provider as (typeof STORAGE_PROVIDERS)[number])) {
    throw new BadRequestException(`storageProvider must be one of: ${STORAGE_PROVIDERS.join(', ')}`);
  }

  return provider;
}

function normalizeVisibility(value: string | undefined) {
  if (!value) {
    return 'PRIVATE';
  }

  const visibility = String(value).trim().toUpperCase();
  if (!VISIBILITIES.includes(visibility as (typeof VISIBILITIES)[number])) {
    throw new BadRequestException(`visibility must be one of: ${VISIBILITIES.join(', ')}`);
  }

  return visibility;
}

function inferKindFromMimeType(mimeType: string) {
  for (const [kind, prefixes] of Object.entries(KIND_MIME_PREFIXES)) {
    if (prefixes.some((prefix) => mimeType.startsWith(prefix))) {
      return kind;
    }
  }

  return 'other';
}

function isMimeAllowedForKind(kind: string, mimeType: string) {
  const prefixes = KIND_MIME_PREFIXES[kind];
  if (!prefixes || prefixes.length === 0) {
    return true;
  }

  return prefixes.some((prefix) => mimeType.startsWith(prefix));
}
