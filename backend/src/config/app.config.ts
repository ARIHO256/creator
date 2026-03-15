export default () => ({
  app: {
    port: Number(process.env.PORT ?? "4010"),
    host: process.env.HOST ?? "0.0.0.0",
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? "15000"),
    keepAliveTimeoutMs: Number(process.env.KEEP_ALIVE_TIMEOUT_MS ?? "72000"),
    connectionTimeoutMs: Number(process.env.CONNECTION_TIMEOUT_MS ?? "5000"),
    maxRequestsPerSocket: Number(process.env.MAX_REQUESTS_PER_SOCKET ?? "1000"),
    bodyLimitBytes: Number(
      process.env.BODY_LIMIT_BYTES ?? `${10 * 1024 * 1024}`,
    ),
  },
  platform: {
    instanceId:
      process.env.INSTANCE_ID ?? `${process.pid}-${Math.random().toString(16).slice(2)}`,
    region: process.env.APP_REGION ?? "local",
    environment: process.env.NODE_ENV ?? "development",
    trustProxy: !["0", "false", "no", "off"].includes(
      String(process.env.TRUST_PROXY ?? "true").toLowerCase(),
    ),
  },
  database: {
    writeUrl: process.env.DATABASE_URL ?? "",
    readUrl: process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL ?? "",
    queryBudgetMs: Number(process.env.DATABASE_QUERY_BUDGET_MS ?? "75"),
  },
  rateLimit: {
    disabled: !["0", "false", "no", "off"].includes(
      String(process.env.RATE_LIMIT_DISABLED ?? "false").toLowerCase(),
    ),
    defaultLimit: Number(process.env.RATE_LIMIT_DEFAULT_LIMIT ?? "120"),
    defaultWindowMs: Number(
      process.env.RATE_LIMIT_DEFAULT_WINDOW_MS ?? "60000",
    ),
    redisUrl: process.env.RATE_LIMIT_REDIS_URL ?? process.env.REDIS_URL ?? "",
    redisPrefix: process.env.RATE_LIMIT_REDIS_PREFIX ?? "mldz:ratelimit:",
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
    workerConcurrency: Number(process.env.JOBS_WORKER_CONCURRENCY ?? "5"),
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
    publicReadTtlMs: Number(process.env.CACHE_PUBLIC_READ_TTL_MS ?? "60000"),
    publicFeedTtlMs: Number(process.env.CACHE_PUBLIC_FEED_TTL_MS ?? "30000"),
    storefrontTtlMs: Number(process.env.CACHE_STOREFRONT_TTL_MS ?? "120000"),
    taxonomyTtlMs: Number(process.env.CACHE_TAXONOMY_TTL_MS ?? "300000"),
    summaryTtlMs: Number(process.env.CACHE_SUMMARY_TTL_MS ?? "30000"),
    maxEntries: Number(process.env.CACHE_MAX_ENTRIES ?? "5000"),
    redisUrl: process.env.REDIS_URL ?? "",
    redisPrefix: process.env.CACHE_REDIS_PREFIX ?? "mldz:cache:",
    lockTtlMs: Number(process.env.CACHE_LOCK_TTL_MS ?? "5000"),
    redisTimeoutMs: Number(process.env.CACHE_REDIS_TIMEOUT_MS ?? "150"),
    redisCircuitFailureThreshold: Number(
      process.env.CACHE_REDIS_CIRCUIT_FAILURE_THRESHOLD ?? "5",
    ),
    redisCircuitResetMs: Number(
      process.env.CACHE_REDIS_CIRCUIT_RESET_MS ?? "10000",
    ),
    warmListingsLimit: Number(process.env.CACHE_WARM_LISTINGS_LIMIT ?? "24"),
    httpEnabled: !["0", "false", "no", "off"].includes(
      String(process.env.HTTP_CACHE_CONTROL_ENABLED ?? "true").toLowerCase(),
    ),
  },
  realtime: {
    enabled: !["0", "false", "no", "off"].includes(
      String(process.env.REALTIME_ENABLED ?? "true").toLowerCase(),
    ),
    redisUrl: process.env.REALTIME_REDIS_URL ?? process.env.REDIS_URL ?? "",
    channelPrefix: process.env.REALTIME_CHANNEL_PREFIX ?? "mldz:realtime:",
    streamServerEnabled: !["0", "false", "no", "off"].includes(
      String(process.env.REALTIME_STREAM_SERVER_ENABLED ?? "true").toLowerCase(),
    ),
    subscriberEnabled: !["0", "false", "no", "off"].includes(
      String(
        process.env.REALTIME_SUBSCRIBER_ENABLED ??
          process.env.REALTIME_STREAM_SERVER_ENABLED ??
          "true",
      ).toLowerCase(),
    ),
    maxAttempts: Number(process.env.REALTIME_MAX_ATTEMPTS ?? "3"),
    streamPingMs: Number(process.env.REALTIME_STREAM_PING_MS ?? "25000"),
    streamMaxClientsPerUser: Number(
      process.env.REALTIME_STREAM_MAX_PER_USER ?? "3",
    ),
    streamMaxClientsTotal: Number(
      process.env.REALTIME_STREAM_MAX_TOTAL ?? "5000",
    ),
    streamPresenceTtlMs: Number(
      process.env.REALTIME_STREAM_PRESENCE_TTL_MS ?? "90000",
    ),
    streamHistorySize: Number(process.env.REALTIME_STREAM_HISTORY_SIZE ?? "50"),
    streamHistoryTtlMs: Number(
      process.env.REALTIME_STREAM_HISTORY_TTL_MS ?? "300000",
    ),
    streamStatePrefix:
      process.env.REALTIME_STREAM_STATE_PREFIX ?? "mldz:realtime:state:",
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
  analytics: {
    snapshotTtlMs: Number(process.env.ANALYTICS_SNAPSHOT_TTL_MS ?? "60000"),
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
    readModelTtlMs: Number(process.env.DASHBOARD_READ_MODEL_TTL_MS ?? "60000"),
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
    registerQueueEnabled: !["0", "false", "no", "off"].includes(
      String(process.env.AUTH_REGISTER_QUEUE_ENABLED ?? "true").toLowerCase(),
    ),
    registrationQueueSecret:
      process.env.AUTH_REGISTER_QUEUE_SECRET ??
      process.env.JWT_ACCESS_SECRET ??
      "change-me-registration-queue-secret",
    registrationPollAfterMs: Number(
      process.env.AUTH_REGISTER_POLL_AFTER_MS ?? "1000",
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
  telemetry: {
    enabled: !["0", "false", "no", "off"].includes(
      String(process.env.OTEL_ENABLED ?? "false").toLowerCase(),
    ),
    serviceName: process.env.OTEL_SERVICE_NAME ?? "mldz-backend",
    serviceVersion: process.env.OTEL_SERVICE_VERSION ?? "2.0.0",
    exporterUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "",
  },
  loadTest: {
    enabled: ["1", "true", "yes", "on"].includes(
      String(process.env.LOAD_TEST_MODE ?? "").toLowerCase(),
    ),
  },
});
