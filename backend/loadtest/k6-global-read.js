import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:4010';
const authToken = __ENV.AUTH_TOKEN || '';

export const options = {
  scenarios: {
    public_catalog: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 5000,
      stages: [
        { target: 1000, duration: '2m' },
        { target: 5000, duration: '5m' },
        { target: 10000, duration: '5m' }
      ]
    },
    authenticated_dashboard: {
      executor: 'ramping-arrival-rate',
      startRate: authToken ? 50 : 0,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 3000,
      stages: [
        { target: authToken ? 500 : 0, duration: '2m' },
        { target: authToken ? 2500 : 0, duration: '5m' }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200', 'p(99)<400']
  }
};

const publicPaths = [
  '/health',
  '/api/ready',
  '/api/landing/content',
  '/api/sellers?limit=20',
  '/api/marketplace/sellers?limit=20',
  '/api/taxonomy/trees'
];

const authenticatedPaths = [
  '/api/app/bootstrap',
  '/api/dashboard/feed',
  '/api/dashboard/summary',
  '/api/dashboard/my-day'
];

export default function () {
  const scenario = __ENV.K6_SCENARIO || 'public';
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const pathList = scenario === 'authenticated' && authToken ? authenticatedPaths : publicPaths;
  const path = pathList[Math.floor(Math.random() * pathList.length)];
  const response = http.get(`${baseUrl}${path}`, { headers });

  check(response, {
    'status is ok': (res) => res.status >= 200 && res.status < 400
  });

  sleep(0.1);
}
