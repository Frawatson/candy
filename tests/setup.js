```javascript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { vi } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Mock console methods to reduce noise during tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Restore console methods
  vi.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  mockVercelDeployment: (success = true) => {
    if (success) {
      return {
        url: 'https://agentflow-app-test.vercel.app',
        deploymentId: 'dpl_test123',
        status: 'ready'
      };
    } else {
      throw new Error('Deployment failed');
    }
  },
  
  mockHttpResponse: (status = 200, headers = {}, body = '') => {
    return {
      status,
      headers: {
        'content-type': 'text/html',
        ...headers
      },
      body
    };
  }
};
```