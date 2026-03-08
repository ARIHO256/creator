export default () => ({
  app: {
    port: Number(process.env.PORT ?? '4010'),
    host: process.env.HOST ?? '0.0.0.0'
  },
  rateLimit: {
    defaultLimit: Number(process.env.RATE_LIMIT_DEFAULT_LIMIT ?? '120'),
    defaultWindowMs: Number(process.env.RATE_LIMIT_DEFAULT_WINDOW_MS ?? '60000'),
    authLimit: Number(process.env.RATE_LIMIT_AUTH_LIMIT ?? '12'),
    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? '60000'),
    uploadLimit: Number(process.env.RATE_LIMIT_UPLOAD_LIMIT ?? '20'),
    uploadWindowMs: Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS ?? '60000')
  },
  upload: {
    defaultProvider: process.env.UPLOAD_STORAGE_PROVIDER ?? 'LOCAL',
    sessionTtlMinutes: Number(process.env.UPLOAD_SESSION_TTL_MINUTES ?? '20'),
    signingSecret: process.env.UPLOAD_SIGNING_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'change-me-upload-secret'
  },
  auth: {
    disabled: ['1', 'true', 'yes', 'on'].includes(String(process.env.AUTH_DISABLED ?? '').toLowerCase()),
    devUserId: process.env.AUTH_DEV_USER_ID ?? 'user_ronald',
    devUserRole: process.env.AUTH_DEV_USER_ROLE ?? 'CREATOR',
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? '30')
  }
});
