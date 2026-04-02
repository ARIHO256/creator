const UUID_FRAGMENT_RE =
  /_?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function extractSequence(rawId: string) {
  const normalized = String(rawId || "").trim();
  if (!normalized) {
    return 0;
  }

  const existingEvId = normalized.match(/^EV(\d{1,8})$/i);
  if (existingEvId) {
    return Number(existingEvId[1]);
  }

  const withoutUuid = normalized.replace(UUID_FRAGMENT_RE, "");
  const suffixMatch = withoutUuid.match(/(\d+)(?!.*\d)/);
  if (suffixMatch) {
    return Number(suffixMatch[1]);
  }

  return (hashString(normalized) % 99_999_999) + 1;
}

export function formatOrderDisplayId(rawId: string) {
  const sequence = extractSequence(rawId);
  return `EV${String(sequence).padStart(8, "0")}`;
}

export function formatOrderItemDisplaySku(rawSku?: string | null, fallbackId?: string | null) {
  const sku = String(rawSku || "").trim();
  const fallback = String(fallbackId || "").trim();
  const source = sku || fallback;

  if (!source) {
    return "";
  }

  const looksInternal =
    /^(order_item|listing|item|order)_/i.test(source) ||
    (source.length > 24 && /[_-]/.test(source));

  if (sku && !looksInternal) {
    return sku;
  }

  const sequence = extractSequence(source);
  return `SKU${String(sequence).padStart(8, "0")}`;
}
