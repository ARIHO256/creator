import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:4010';

export const options = {
  scenarios: {
    cached_public_reads: {
      executor: 'ramping-arrival-rate',
      startRate: 250,
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 4000,
      stages: [
        { target: 1000, duration: '2m' },
        { target: 3000, duration: '5m' },
        { target: 5000, duration: '5m' }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<150', 'p(99)<300']
  }
};

const publicPaths = [
  '/api/landing/content',
  '/api/marketplace/sellers?limit=24',
  '/api/sellers?limit=24',
  '/api/storefront/demo-store',
  '/api/storefront/demo-store/listings?limit=24',
  '/api/taxonomy/trees'
];

export default function () {
  const path = publicPaths[Math.floor(Math.random() * publicPaths.length)];
  const response = http.get(`${baseUrl}${path}`);

  check(response, {
    'cached public status ok': (res) => res.status >= 200 && res.status < 400
  });

  sleep(0.05);
}
