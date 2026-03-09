export function buildSecurityHeaders(enabled: boolean) {
  if (!enabled) {
    return {};
  }

  return {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-site',
    'x-permitted-cross-domain-policies': 'none'
  };
}
