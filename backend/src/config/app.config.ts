export default () => ({
  app: {
    port: Number(process.env.PORT ?? '4010'),
    host: process.env.HOST ?? '0.0.0.0',
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? '15000'),
    bodyLimitBytes: Number(process.env.BODY_LIMIT_BYTES ?? `${10 * 1024 * 1024}`)
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
  jobs: {
    defaultMaxAttempts: Number(process.env.JOBS_DEFAULT_MAX_ATTEMPTS ?? '5'),
    retryDelayMs: Number(process.env.JOBS_RETRY_DELAY_MS ?? '60000'),
    workerId: process.env.JOBS_WORKER_ID ?? 'api',
    workerEnabled: !['0', 'false', 'no', 'off'].includes(String(process.env.JOBS_WORKER_ENABLED ?? 'true').toLowerCase()),
    workerPollMs: Number(process.env.JOBS_WORKER_POLL_MS ?? '2000'),
    workerBatch: Number(process.env.JOBS_WORKER_BATCH ?? '5'),
    lockTtlMs: Number(process.env.JOBS_WORKER_LOCK_TTL_MS ?? `${10 * 60 * 1000}`)
  },
  security: {
    enableHeaders: !['0', 'false', 'no', 'off'].includes(String(process.env.SECURITY_HEADERS_ENABLED ?? 'true').toLowerCase()),
    warnOnDefaultSecrets: !['0', 'false', 'no', 'off'].includes(String(process.env.WARN_ON_DEFAULT_SECRETS ?? 'true').toLowerCase())
  },
  cache: {
    defaultTtlMs: Number(process.env.CACHE_DEFAULT_TTL_MS ?? '15000'),
    maxEntries: Number(process.env.CACHE_MAX_ENTRIES ?? '5000'),
    redisUrl: process.env.REDIS_URL ?? '',
    redisPrefix: process.env.CACHE_REDIS_PREFIX ?? 'mldz:cache:',
    lockTtlMs: Number(process.env.CACHE_LOCK_TTL_MS ?? '5000')
  },
  idempotency: {
    ttlMs: Number(process.env.IDEMPOTENCY_TTL_MS ?? `${24 * 60 * 60 * 1000}`)
  },
  audit: {
    enabled: !['0', 'false', 'no', 'off'].includes(String(process.env.AUDIT_ENABLED ?? 'true').toLowerCase()),
    async: !['0', 'false', 'no', 'off'].includes(String(process.env.AUDIT_ASYNC ?? 'true').toLowerCase()),
    sampleRate: Number(process.env.AUDIT_SAMPLE_RATE ?? '1')
  },
  auth: {
    disabled: ['1', 'true', 'yes', 'on'].includes(String(process.env.AUTH_DISABLED ?? '').toLowerCase()),
    devUserId: process.env.AUTH_DEV_USER_ID ?? 'user_ronald',
    devUserRole: process.env.AUTH_DEV_USER_ROLE ?? 'CREATOR',
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? '30')
  },
  logging: {
    fastifyLogger: !['0', 'false', 'no', 'off'].includes(String(process.env.FASTIFY_LOGGER ?? 'true').toLowerCase()),
    requestLogs: !['0', 'false', 'no', 'off'].includes(String(process.env.REQUEST_LOGS_ENABLED ?? 'true').toLowerCase())
  },
  loadTest: {
    enabled: ['1', 'true', 'yes', 'on'].includes(String(process.env.LOAD_TEST_MODE ?? '').toLowerCase())
  }
});
