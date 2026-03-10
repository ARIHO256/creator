export default () => ({
  app: {
    port: Number(process.env.PORT ?? "4010"),
    host: process.env.HOST ?? "0.0.0.0",
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? "15000"),
    bodyLimitBytes: Number(
      process.env.BODY_LIMIT_BYTES ?? `${10 * 1024 * 1024}`,
    ),
  },
  rateLimit: {
    defaultLimit: Number(process.env.RATE_LIMIT_DEFAULT_LIMIT ?? "120"),
    defaultWindowMs: Number(
      process.env.RATE_LIMIT_DEFAULT_WINDOW_MS ?? "60000",
    ),
    authLimit: Number(process.env.RATE_LIMIT_AUTH_LIMIT ?? "12"),
    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? "60000"),
    uploadLimit: Number(process.env.RATE_LIMIT_UPLOAD_LIMIT ?? "20"),
    uploadWindowMs: Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS ?? "60000"),
  },
  upload: {
    defaultProvider: process.env.UPLOAD_STORAGE_PROVIDER ?? "LOCAL",
    sessionTtlMinutes: Number(process.env.UPLOAD_SESSION_TTL_MINUTES ?? "20"),
    signingSecret:
      process.env.UPLOAD_SIGNING_SECRET ??
      process.env.JWT_ACCESS_SECRET ??
      "change-me-upload-secret",
  },
  jobs: {
    defaultMaxAttempts: Number(process.env.JOBS_DEFAULT_MAX_ATTEMPTS ?? "5"),
    retryDelayMs: Number(process.env.JOBS_RETRY_DELAY_MS ?? "60000"),
    workerId: process.env.JOBS_WORKER_ID ?? "api",
    workerEnabled: !["0", "false", "no", "off"].includes(
      String(process.env.JOBS_WORKER_ENABLED ?? "true").toLowerCase(),
    ),
    workerPollMs: Number(process.env.JOBS_WORKER_POLL_MS ?? "2000"),
    workerBatch: Number(process.env.JOBS_WORKER_BATCH ?? "5"),
    lockTtlMs: Number(
      process.env.JOBS_WORKER_LOCK_TTL_MS ?? `${10 * 60 * 1000}`,
    ),
  },
  security: {
    enableHeaders: !["0", "false", "no", "off"].includes(
      String(process.env.SECURITY_HEADERS_ENABLED ?? "true").toLowerCase(),
    ),
    warnOnDefaultSecrets: !["0", "false", "no", "off"].includes(
      String(process.env.WARN_ON_DEFAULT_SECRETS ?? "true").toLowerCase(),
    ),
  },
  cache: {
    defaultTtlMs: Number(process.env.CACHE_DEFAULT_TTL_MS ?? "15000"),
    maxEntries: Number(process.env.CACHE_MAX_ENTRIES ?? "5000"),
    redisUrl: process.env.REDIS_URL ?? "",
    redisPrefix: process.env.CACHE_REDIS_PREFIX ?? "mldz:cache:",
    lockTtlMs: Number(process.env.CACHE_LOCK_TTL_MS ?? "5000"),
  },
  realtime: {
    enabled: !["0", "false", "no", "off"].includes(
      String(process.env.REALTIME_ENABLED ?? "true").toLowerCase(),
    ),
    redisUrl: process.env.REALTIME_REDIS_URL ?? process.env.REDIS_URL ?? "",
    channelPrefix: process.env.REALTIME_CHANNEL_PREFIX ?? "mldz:realtime:",
    maxAttempts: Number(process.env.REALTIME_MAX_ATTEMPTS ?? "3"),
    streamPingMs: Number(process.env.REALTIME_STREAM_PING_MS ?? "25000"),
    streamMaxClientsPerUser: Number(
      process.env.REALTIME_STREAM_MAX_PER_USER ?? "3",
    ),
    streamMaxClientsTotal: Number(
      process.env.REALTIME_STREAM_MAX_TOTAL ?? "5000",
    ),
    streamHistorySize: Number(process.env.REALTIME_STREAM_HISTORY_SIZE ?? "50"),
    streamHistoryTtlMs: Number(
      process.env.REALTIME_STREAM_HISTORY_TTL_MS ?? "300000",
    ),
    deliveryEnabled: !["0", "false", "no", "off"].includes(
      String(process.env.REALTIME_DELIVERY_ENABLED ?? "true").toLowerCase(),
    ),
    deliveryTtlMs: Number(process.env.REALTIME_DELIVERY_TTL_MS ?? "600000"),
    deliveryPollLimit: Number(process.env.REALTIME_DELIVERY_POLL_LIMIT ?? "50"),
    deliveryMaxAttempts: Number(
      process.env.REALTIME_DELIVERY_MAX_ATTEMPTS ?? "5",
    ),
    deliveryRetryMs: Number(process.env.REALTIME_DELIVERY_RETRY_MS ?? "15000"),
    deliverySweepMs: Number(process.env.REALTIME_DELIVERY_SWEEP_MS ?? "15000"),
    deliverySweepEnabled: !["0", "false", "no", "off"].includes(
      String(
        process.env.REALTIME_DELIVERY_SWEEP_ENABLED ?? "true",
      ).toLowerCase(),
    ),
  },
  idempotency: {
    ttlMs: Number(process.env.IDEMPOTENCY_TTL_MS ?? `${24 * 60 * 60 * 1000}`),
  },
  audit: {
    enabled: !["0", "false", "no", "off"].includes(
      String(process.env.AUDIT_ENABLED ?? "true").toLowerCase(),
    ),
    async: !["0", "false", "no", "off"].includes(
      String(process.env.AUDIT_ASYNC ?? "true").toLowerCase(),
    ),
    sampleRate: Number(process.env.AUDIT_SAMPLE_RATE ?? "1"),
  },
  approvals: {
    slaHours: Number(process.env.APPROVAL_SLA_HOURS ?? "48"),
    reminderHours: Number(process.env.APPROVAL_REMINDER_HOURS ?? "24"),
    escalateAfterHours: Number(process.env.APPROVAL_ESCALATE_HOURS ?? "72"),
  },
  finance: {
    settlementBatchLimit: Number(
      process.env.FINANCE_SETTLEMENT_BATCH_LIMIT ?? "500",
    ),
    settlementMinAmount: Number(
      process.env.FINANCE_SETTLEMENT_MIN_AMOUNT ?? "0",
    ),
  },
  dashboard: {
    snapshotTtlMs: Number(process.env.DASHBOARD_SNAPSHOT_TTL_MS ?? "60000"),
  },
  storage: {
    rootDir: process.env.STORAGE_ROOT_DIR ?? `${process.cwd()}/storage`,
  },
  exports: {
    fileTtlDays: Number(process.env.EXPORT_FILE_TTL_DAYS ?? "7"),
    storageNamespace: process.env.EXPORT_STORAGE_NAMESPACE ?? "exports",
  },
  moderation: {
    bannedPhrases: process.env.MODERATION_BANNED_PHRASES ?? "",
    blockedExtensions:
      process.env.MODERATION_BLOCKED_EXTENSIONS ?? ".exe,.bat,.cmd,.js,.vbs",
    maxFileSizeMb: Number(process.env.MODERATION_MAX_FILE_SIZE_MB ?? "25"),
  },
  regulatory: {
    evidenceTtlDays: Number(process.env.REGULATORY_EVIDENCE_TTL_DAYS ?? "14"),
    storageNamespace: process.env.REGULATORY_STORAGE_NAMESPACE ?? "evidence",
  },
  search: {
    enabled: !["0", "false", "no", "off"].includes(
      String(process.env.SEARCH_ENABLED ?? "true").toLowerCase(),
    ),
    indexBatch: Number(process.env.SEARCH_INDEX_BATCH ?? "250"),
    queryLimit: Number(process.env.SEARCH_QUERY_LIMIT ?? "50"),
  },
  auth: {
    disabled: ["1", "true", "yes", "on"].includes(
      String(process.env.AUTH_DISABLED ?? "").toLowerCase(),
    ),
    devUserId: process.env.AUTH_DEV_USER_ID ?? "user_ronald",
    devUserRole: process.env.AUTH_DEV_USER_ROLE ?? "CREATOR",
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret",
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh-secret",
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? "30"),
  },
  logging: {
    fastifyLogger: !["0", "false", "no", "off"].includes(
      String(process.env.FASTIFY_LOGGER ?? "true").toLowerCase(),
    ),
    requestLogs: !["0", "false", "no", "off"].includes(
      String(process.env.REQUEST_LOGS_ENABLED ?? "true").toLowerCase(),
    ),
  },
  loadTest: {
    enabled: ["1", "true", "yes", "on"].includes(
      String(process.env.LOAD_TEST_MODE ?? "").toLowerCase(),
    ),
  },
});
