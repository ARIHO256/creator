const UUID_SUFFIX_RE =
  /_?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const withoutUuid = normalized.replace(UUID_SUFFIX_RE, "");
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
