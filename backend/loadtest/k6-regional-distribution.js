import http from 'k6/http';
import { check, sleep } from 'k6';

const usBaseUrl = __ENV.BASE_URL_US || __ENV.BASE_URL || 'http://127.0.0.1:4010';
const euBaseUrl = __ENV.BASE_URL_EU || usBaseUrl;
const apacBaseUrl = __ENV.BASE_URL_APAC || usBaseUrl;

export const options = {
  scenarios: {
    us_traffic: {
      executor: 'constant-arrival-rate',
      rate: 1200,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 300,
      maxVUs: 2000,
      exec: 'usTraffic'
    },
    eu_traffic: {
      executor: 'constant-arrival-rate',
      rate: 800,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 200,
      maxVUs: 1500,
      exec: 'euTraffic'
    },
    apac_traffic: {
      executor: 'constant-arrival-rate',
      rate: 600,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 150,
      maxVUs: 1200,
      exec: 'apacTraffic'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200', 'p(99)<400']
  }
};

function hitRegion(baseUrl) {
  const response = http.get(`${baseUrl}/api/storefront/demo-store`);
  check(response, {
    'regional request ok': (res) => res.status >= 200 && res.status < 400
  });
  sleep(0.05);
}

export function usTraffic() {
  hitRegion(usBaseUrl);
}

export function euTraffic() {
  hitRegion(euBaseUrl);
}

export function apacTraffic() {
  hitRegion(apacBaseUrl);
}
