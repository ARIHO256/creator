const baseUrl = String(process.env.LOAD_TEST_BASE_URL ?? 'http://127.0.0.1:4010');
const concurrency = readNumber('LOAD_TEST_CONCURRENCY', 100);
const durationSeconds = readNumber('LOAD_TEST_DURATION_SECONDS', 30);
const timeoutMs = readNumber('LOAD_TEST_TIMEOUT_MS', 10_000);
const scenario = String(process.env.LOAD_TEST_SCENARIO ?? 'public').trim().toLowerCase();
const method = String(process.env.LOAD_TEST_METHOD ?? 'GET').trim().toUpperCase();
const bearerToken = String(process.env.LOAD_TEST_BEARER_TOKEN ?? '').trim();
const cookie = String(process.env.LOAD_TEST_COOKIE ?? '').trim();
const customPaths = parsePaths(process.env.LOAD_TEST_PATHS);

const scenarioTargets = {
  public: [
    '/health',
    '/api/ready',
    '/api/routes',
    '/api/landing/content',
    '/api/sellers?limit=20',
    '/api/marketplace/sellers?limit=20',
    '/api/taxonomy/trees'
  ],
  seller: [
    '/api/ready',
    '/api/app/bootstrap',
    '/api/dashboard/feed',
    '/api/dashboard/summary',
    '/api/dashboard/my-day'
  ]
};

const targets = customPaths.length ? customPaths : scenarioTargets[scenario] ?? scenarioTargets.public;

const headers = {};
if (bearerToken) {
  headers.authorization = `Bearer ${bearerToken}`;
}
if (cookie) {
  headers.cookie = cookie;
}

const stats = {
  startedAt: Date.now(),
  completed: 0,
  succeeded: 0,
  failed: 0,
  timeouts: 0,
  bytes: 0,
  latencies: [],
  statuses: new Map(),
  errors: new Map()
};

const deadline = Date.now() + durationSeconds * 1000;

console.log(
  JSON.stringify(
    {
      baseUrl,
      scenario,
      method,
      concurrency,
      durationSeconds,
      timeoutMs,
      targets
    },
    null,
    2
  )
);

await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)));

const elapsedMs = Math.max(Date.now() - stats.startedAt, 1);
const sortedLatencies = [...stats.latencies].sort((a, b) => a - b);
const summary = {
  elapsedMs,
  requestsPerSecond: round((stats.completed / elapsedMs) * 1000),
  completed: stats.completed,
  succeeded: stats.succeeded,
  failed: stats.failed,
  timeouts: stats.timeouts,
  errorRatePct: round(stats.completed ? (stats.failed / stats.completed) * 100 : 0),
  responseBytes: stats.bytes,
  latencyMs: {
    min: sortedLatencies[0] ?? 0,
    p50: percentile(sortedLatencies, 0.5),
    p95: percentile(sortedLatencies, 0.95),
    p99: percentile(sortedLatencies, 0.99),
    max: sortedLatencies.at(-1) ?? 0,
    avg: round(stats.latencies.reduce((sum, value) => sum + value, 0) / Math.max(stats.latencies.length, 1))
  },
  statuses: Object.fromEntries([...stats.statuses.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
  errors: Object.fromEntries([...stats.errors.entries()].sort((a, b) => a[0].localeCompare(b[0])))
};

console.log(JSON.stringify(summary, null, 2));

async function worker(workerIndex) {
  let requestIndex = workerIndex;
  while (Date.now() < deadline) {
    const path = targets[requestIndex % targets.length];
    requestIndex += 1;
    await issueRequest(path);
  }
}

async function issueRequest(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers,
      signal: controller.signal
    });
    const body = await response.arrayBuffer();
    const latencyMs = round(performance.now() - startedAt);
    recordLatency(latencyMs);
    stats.completed += 1;
    stats.bytes += body.byteLength;
    increment(stats.statuses, String(response.status));
    if (response.ok) {
      stats.succeeded += 1;
    } else {
      stats.failed += 1;
      increment(stats.errors, `http_${response.status}`);
    }
  } catch (error) {
    const latencyMs = round(performance.now() - startedAt);
    recordLatency(latencyMs);
    stats.completed += 1;
    stats.failed += 1;
    if (error?.name === 'AbortError') {
      stats.timeouts += 1;
      increment(stats.errors, 'timeout');
    } else {
      increment(stats.errors, error?.name ? String(error.name) : 'request_error');
    }
  } finally {
    clearTimeout(timeout);
  }
}

function recordLatency(latencyMs) {
  stats.latencies.push(latencyMs);
}

function parsePaths(rawValue) {
  return String(rawValue ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function readNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function percentile(values, ratio) {
  if (!values.length) {
    return 0;
  }
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1));
  return values[index];
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function round(value) {
  return Number(value.toFixed(2));
}
