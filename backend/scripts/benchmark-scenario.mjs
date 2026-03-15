import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const baseUrl = String(process.env.BENCHMARK_BASE_URL ?? process.env.LOAD_TEST_BASE_URL ?? 'http://127.0.0.1:4010');
const metricsUrl = String(process.env.BENCHMARK_METRICS_URL ?? `${baseUrl}/metrics`);
const readyUrl = String(process.env.BENCHMARK_READY_URL ?? `${baseUrl}/api/ready`);
const name = String(process.env.BENCHMARK_NAME ?? process.env.LOAD_TEST_SCENARIO ?? 'benchmark');

const before = await captureState();
const { stdout, stderr } = await execFileAsync(process.execPath, ['scripts/load-test.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    LOAD_TEST_BASE_URL: baseUrl,
    LOAD_TEST_OUTPUT: 'json'
  },
  maxBuffer: 1024 * 1024 * 8
});
if (stderr?.trim()) {
  console.error(stderr.trim());
}
const after = await captureState();

const payload = parseLoadResult(stdout);
const report = {
  scenario: name,
  load: payload.summary,
  metricsDelta: diffMetrics(before.metrics, after.metrics),
  readyBefore: before.ready,
  readyAfter: after.ready
};

console.log(JSON.stringify(report, null, 2));

async function captureState() {
  const [metricsText, ready] = await Promise.all([fetchText(metricsUrl), fetchJson(readyUrl)]);
  return {
    metrics: parsePrometheus(metricsText),
    ready
  };
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

function parseLoadResult(stdout) {
  const lines = String(stdout ?? '')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const raw = lines.at(-1);
  if (!raw) {
    throw new Error('Load test produced no JSON summary');
  }
  return JSON.parse(raw);
}

function parsePrometheus(text) {
  const metrics = new Map();
  for (const line of String(text ?? '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const match = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/i);
    if (!match) {
      continue;
    }
    const [, name, labels = '', value] = match;
    metrics.set(`${name}${labels}`, Number(value));
  }
  return metrics;
}

function diffMetrics(before, after) {
  const select = [
    'cache_hits_total',
    'cache_misses_total',
    'cache_writes_total',
    'cache_errors_total',
    'cache_waits_total',
    'db_query_duration_ms_count',
    'db_query_duration_ms_sum',
    'db_slow_queries_total',
    'jobs_processed_total',
    'jobs_failed_total',
    'background_jobs_due_pending',
    'background_jobs_active_locks',
    'background_jobs_dead_letters',
    'dependency_circuit_state',
    'http_requests_total',
    'http_request_duration_ms_count',
    'http_request_duration_ms_sum'
  ];

  const diff = {};
  for (const [key, value] of after.entries()) {
    if (!select.some((prefix) => key.startsWith(prefix))) {
      continue;
    }
    diff[key] = round(value - (before.get(key) ?? 0));
  }
  return diff;
}

function round(value) {
  return Number(value.toFixed(4));
}
