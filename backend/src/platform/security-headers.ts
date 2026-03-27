export function buildSecurityHeaders(enabled: boolean) {
  if (!enabled) {
    return {};
  }

  const explicitCorp = String(process.env.CROSS_ORIGIN_RESOURCE_POLICY ?? '')
    .trim()
    .toLowerCase();
  const corpPolicy =
    explicitCorp === 'same-origin' || explicitCorp === 'same-site' || explicitCorp === 'cross-origin'
      ? explicitCorp
      : process.env.NODE_ENV === 'production'
        ? 'same-site'
        : 'cross-origin';

  return {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': corpPolicy,
    'x-permitted-cross-domain-policies': 'none'
  };
}
