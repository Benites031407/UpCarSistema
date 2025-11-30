// Load testing script for Machine Rental System using k6
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate must be below 10%
  },
};

// Base URL - should be set via environment variable
const BASE_URL = __ENV.BASE_URL || 'https://staging.yourdomain.com';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'testpass123' },
  { email: 'test2@example.com', password: 'testpass123' },
  { email: 'test3@example.com', password: 'testpass123' },
];

const testMachines = [
  'MACHINE001',
  'MACHINE002',
  'MACHINE003',
];

// Helper function to authenticate and get token
function authenticate(user) {
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
    email: user.email,
    password: user.password,
  }, {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response has token': (r) => r.json('token') !== undefined,
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  return loginResponse.json('token');
}

// Test scenarios
export default function () {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const machineCode = testMachines[Math.floor(Math.random() * testMachines.length)];

  // Test 1: Health check
  testHealthCheck();
  sleep(1);

  // Test 2: Authentication flow
  const token = authenticate(user);
  if (!token) return;
  sleep(1);

  // Test 3: Machine lookup
  testMachineLookup(machineCode, token);
  sleep(1);

  // Test 4: Account balance check
  testAccountBalance(token);
  sleep(1);

  // Test 5: Machine activation simulation
  testMachineActivation(machineCode, token);
  sleep(2);

  // Test 6: Usage history
  testUsageHistory(token);
  sleep(1);
}

function testHealthCheck() {
  const response = http.get(`${BASE_URL}/health`);
  
  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!success) errorRate.add(1);
}

function testMachineLookup(machineCode, token) {
  const response = http.get(`${BASE_URL}/api/machines/${machineCode}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const success = check(response, {
    'machine lookup status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'machine lookup response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (!success) errorRate.add(1);
}

function testAccountBalance(token) {
  const response = http.get(`${BASE_URL}/api/users/balance`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const success = check(response, {
    'balance check status is 200': (r) => r.status === 200,
    'balance check has balance field': (r) => r.json('balance') !== undefined,
    'balance check response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (!success) errorRate.add(1);
}

function testMachineActivation(machineCode, token) {
  const activationData = {
    machineCode: machineCode,
    duration: Math.floor(Math.random() * 30) + 1, // 1-30 minutes
    paymentMethod: 'balance',
  };

  const response = http.post(`${BASE_URL}/api/sessions`, JSON.stringify(activationData), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const success = check(response, {
    'activation request processed': (r) => r.status === 200 || r.status === 400 || r.status === 402,
    'activation response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  if (!success) errorRate.add(1);
}

function testUsageHistory(token) {
  const response = http.get(`${BASE_URL}/api/sessions/history`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const success = check(response, {
    'usage history status is 200': (r) => r.status === 200,
    'usage history is array': (r) => Array.isArray(r.json()),
    'usage history response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (!success) errorRate.add(1);
}

// Admin dashboard load test
export function adminLoadTest() {
  // This would test admin-specific endpoints
  const adminToken = authenticate({ email: 'admin@example.com', password: 'adminpass123' });
  if (!adminToken) return;

  // Test admin dashboard endpoints
  testAdminDashboard(adminToken);
  testMachineRegistry(adminToken);
  testCustomerManagement(adminToken);
}

function testAdminDashboard(token) {
  const response = http.get(`${BASE_URL}/api/admin/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  check(response, {
    'admin dashboard status is 200': (r) => r.status === 200,
    'admin dashboard response time < 2000ms': (r) => r.timings.duration < 2000,
  });
}

function testMachineRegistry(token) {
  const response = http.get(`${BASE_URL}/api/admin/machines`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  check(response, {
    'machine registry status is 200': (r) => r.status === 200,
    'machine registry response time < 1500ms': (r) => r.timings.duration < 1500,
  });
}

function testCustomerManagement(token) {
  const response = http.get(`${BASE_URL}/api/admin/customers`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  check(response, {
    'customer management status is 200': (r) => r.status === 200,
    'customer management response time < 1500ms': (r) => r.timings.duration < 1500,
  });
}

// Stress test scenario
export function stressTest() {
  const options = {
    stages: [
      { duration: '1m', target: 50 },  // Ramp up to 50 users
      { duration: '3m', target: 50 },  // Stay at 50 users
      { duration: '1m', target: 100 }, // Ramp up to 100 users
      { duration: '3m', target: 100 }, // Stay at 100 users
      { duration: '1m', target: 0 },   // Ramp down
    ],
  };

  // Run the same tests but with higher load
  return options;
}