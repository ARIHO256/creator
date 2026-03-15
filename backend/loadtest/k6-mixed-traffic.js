import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:4010';
const sellerToken = __ENV.SELLER_TOKEN || '';

export const options = {
  scenarios: {
    public_reads: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 150,
      maxVUs: 2500,
      stages: [
        { target: 800, duration: '3m' },
        { target: 1500, duration: '5m' }
      ],
      exec: 'publicTraffic'
    },
    seller_reads: {
      executor: 'ramping-arrival-rate',
      startRate: sellerToken ? 25 : 0,
      timeUnit: '1s',
      preAllocatedVUs: 80,
      maxVUs: 1200,
      stages: [
        { target: sellerToken ? 200 : 0, duration: '3m' },
        { target: sellerToken ? 400 : 0, duration: '5m' }
      ],
      exec: 'sellerTraffic'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<250', 'p(99)<500']
  }
};

const publicPaths = [
  '/api/landing/content',
  '/api/marketplace/sellers?limit=20',
  '/api/storefront/demo-store',
  '/api/taxonomy/trees'
];

const sellerPaths = [
  '/api/app/bootstrap',
  '/api/dashboard/feed',
  '/api/dashboard/summary',
  '/api/dashboard/my-day'
];

function send(path, headers = {}) {
  const response = http.get(`${baseUrl}${path}`, { headers });

  check(response, {
    'mixed traffic status ok': (res) => res.status >= 200 && res.status < 500
  });

  sleep(0.1);
}

export function publicTraffic() {
  const path = publicPaths[Math.floor(Math.random() * publicPaths.length)];
  send(path);
}

export function sellerTraffic() {
  const path = sellerPaths[Math.floor(Math.random() * sellerPaths.length)];
  const headers = sellerToken ? { Authorization: `Bearer ${sellerToken}` } : {};
  send(path, headers);
}
