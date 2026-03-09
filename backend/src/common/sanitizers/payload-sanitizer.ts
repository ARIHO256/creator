import { BadRequestException } from '@nestjs/common';

export type PayloadSanitizerOptions = {
  maxDepth?: number;
  maxKeys?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
  normalizeUrlFields?: boolean;
  throwOnInvalidUrl?: boolean;
};

const DEFAULTS: Required<PayloadSanitizerOptions> = {
  maxDepth: 6,
  maxKeys: 200,
  maxArrayLength: 200,
  maxStringLength: 4000,
  normalizeUrlFields: true,
  throwOnInvalidUrl: true
};

const URL_KEY = /url$/i;

export function sanitizePayload(input: unknown, options?: PayloadSanitizerOptions, depth = 0): unknown {
  const config = { ...DEFAULTS, ...options };

  if (input === null || input === undefined) {
    return input;
  }

  if (depth > config.maxDepth) {
    return undefined;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed.length > config.maxStringLength ? trimmed.slice(0, config.maxStringLength) : trimmed;
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'bigint') {
    return input.toString();
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  if (Array.isArray(input)) {
    return input.slice(0, config.maxArrayLength).map((value) => sanitizePayload(value, config, depth + 1));
  }

  if (typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>).slice(0, config.maxKeys);
    const result: Record<string, unknown> = {};

    for (const [key, value] of entries) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      let sanitized = sanitizePayload(value, config, depth + 1);
      if (config.normalizeUrlFields && URL_KEY.test(key) && sanitized !== undefined) {
        sanitized = normalizeUrlValue(sanitized, key, config);
      }

      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }

    return result;
  }

  return undefined;
}

export function normalizeUrlValue(
  value: unknown,
  fieldName = 'url',
  options?: PayloadSanitizerOptions
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const config = { ...DEFAULTS, ...options };

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > 2048) {
    if (config.throwOnInvalidUrl) {
      throw new BadRequestException(`Invalid ${fieldName}: length exceeds 2048`);
    }
    return undefined;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return trimmed;
  } catch {
    if (config.throwOnInvalidUrl) {
      throw new BadRequestException(`Invalid ${fieldName}: must be a valid http(s) URL`);
    }
    return undefined;
  }
}

export function normalizeIdentifier(value: unknown, fallback: string) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return fallback;
  }

  const normalized = raw.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 191);
  return normalized || fallback;
}
