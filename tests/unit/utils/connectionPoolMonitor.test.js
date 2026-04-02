const ConnectionPoolMonitor = require('../../../src/utils/connectionPoolMonitor');
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

describe('ConnectionPoolMonitor', () => {
  let mockPool;
  let monitor;

  beforeEach(() => {
    mockPool = {
      totalCount: 10,
      idleCount: 5,
      waitingCount: 2,
      options: {
        max: 20,
        min: 5
      }
    };
    monitor = new ConnectionPoolMonitor(mockPool);
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (monitor.loggingInterval) {
      monitor.stopPeriodicLogging();
    }
  });

  describe('Query Metrics Recording', () => {
    it('should record successful queries correctly', () => {
      monitor.recordQuery(150, true);
      monitor.recordQuery(200, true);
      monitor.recordQuery(100, true);

      const metrics = monitor.getMetrics();

      expect(metrics.totalQueries).toBe(3);
      expect(metrics.successfulQueries).toBe(3);
      expect(metrics.failedQueries).toBe(0);
      expect(metrics.averageQueryTime).toBeCloseTo(150, 1);
      expect(metrics.maxQueryTime).toBe(200);
      expect(metrics.minQueryTime).toBe(100);
      expect(metrics.successRate).toBe(100);
    });

    it('should record failed queries correctly', () => {
      monitor.recordQuery(150, true);
      monitor.recordQuery(300, false);
      monitor.recordQuery(200, false);

      const metrics = monitor.getMetrics();

      expect(metrics.totalQueries).toBe(3);
      expect(metrics.successfulQueries).toBe(1);
      expect(metrics.failedQueries).toBe(2);
      expect(metrics.successRate).toBeCloseTo(33.33, 1);
    });

    it('should maintain limited query time history', () => {
      // Record more than maxQueryTimesSample (100) queries
      for (let i = 0; i < 150; i++) {
        monitor.recordQuery(100 + i, true);
      }

      expect(monitor.queryTimes.length).toBe(100);
      // Should keep the most recent 100 queries
      expect(monitor.queryTimes[0]).toBe(150); // 100 + 50 (first 50 removed)
      expect(monitor.queryTimes[99]).toBe(249); // 100 + 149
    });

    it('should handle edge case of no queries', () => {
      const metrics = monitor.getMetrics();

      expect(metrics.totalQueries).toBe(0);
      expect(metrics.successfulQueries).toBe(0);
      expect(metrics.failedQueries).toBe(0);
      expect(metrics.successRate).toBe(100); // Default when no queries
      expect(metrics.averageQueryTime).toBe(0);
      expect(metrics.maxQueryTime).toBe(0);
      expect(metrics.minQueryTime).toBe(Infinity);
    });
  });

  describe('Error Recording', () => {
    it('should record connection errors', () => {
      monitor.recordConnectionError();
      monitor.recordConnectionError();

      const metrics = monitor.getMetrics();

      expect(metrics.connectionErrors).toBe(2);
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith('Connection pool error recorded', {
        totalErrors: expect.any(Number),
        poolStats: expect.any(Object)
      });
    });

    it('should record pool exhaustion events', () => {
      monitor.recordPoolExhaustion();
      monitor.recordPoolExhaustion();
      monitor.recordPoolExhaustion();

      const metrics = monitor.getMetrics();

      expect(metrics.poolExhaustionEvents).toBe(3);
      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith('Connection pool exhaustion event recorded', {
        totalEvents: expect.any(Number),
        poolStats: expect.any(Object)
      });
    });
  });

  describe('Pool Statistics', () => {
    it('should return current pool statistics', () => {
      const poolStats = monitor.getPoolStats();

      expect(poolStats).toEqual({
        totalCount: 10,
        idleCount: 5,
        waitingCount: 2,
        maxConnections: 20,
        minConnections: 5
      });
    });

    it('should calculate utilization rate correctly', () => {
      const metrics = monitor.getMetrics();

      expect(metrics.utilizationRate).toBe(0.5); // 10/20
    });
  });

  describe('Health Assessment', () => {
    it('should assess as healthy under normal conditions', () => {
      // Record some successful queries
      for (let i = 0; i < 10; i++) {
        monitor.recordQuery(100, true);
      }

      const isHealthy = monitor.assessHealth();
      const metrics = monitor.getMetrics();

      expect(isHealthy).toBe(true);
      expect(metrics.isHealthy).toBe(true);
    });

    it('should assess as unhealthy with high utilization', () => {
      // Simulate high utilization (95% of max pool size)
      mockPool.totalCount = 19;
      monitor = new ConnectionPoolMonitor(mockPool);

      const isHealthy = monitor.assessHealth();

      expect(isHealthy).toBe(false);
    });

    it('should assess as unhealthy with low success rate', () => {
      // Record mostly failed queries
      for (let i = 0; i < 20; i++) {
        monitor.recordQuery(100, i < 2); // Only first 2 succeed
      }

      const isHealthy = monitor.assessHealth();

      expect(isHealthy).toBe(false);
    });

    it('should assess as unhealthy with high waiting count', () => {
      mockPool.waitingCount = 10;
      monitor = new ConnectionPoolMonitor(mockPool);

      const isHealthy = monitor.assessHealth();

      expect(isHealthy).toBe(false);
    });

    it('should assess as unhealthy with many connection errors', () => {
      for (let i = 0; i < 15; i++) {
        monitor.recordConnectionError();
      }

      const isHealthy = monitor.assessHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Health Report', () => {
    it('should generate comprehensive health report for healthy pool', () => {
      // Set up healthy conditions
      for (let i = 0; i < 10; i++) {
        monitor.recordQuery(150, true);
      }

      const report = monitor.getHealthReport();

      expect(report.status).toBe('healthy');
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.recommendations.length).toBe(0);
    });

    it('should generate recommendations for high utilization', () => {
      mockPool.totalCount = 18; // 90% utilization
      monitor = new ConnectionPoolMonitor(mockPool);

      const report = monitor.getHealthReport();

      expect(report.recommendations).toContain(
        'Consider increasing max pool size - high utilization detected'
      );
    });

    it('should generate recommendations for waiting connections', () => {
      mockPool.waitingCount = 3;
      monitor = new ConnectionPoolMonitor(mockPool);

      const report = monitor.getHealthReport();

      expect(report.recommendations).toContain(
        'Connections are waiting - consider optimizing query performance or increasing pool size'
      );
    });

    it('should generate recommendations for low success rate', () => {
      for (let i = 0; i < 20; i++) {
        monitor.recordQuery(100, i < 18); // 90% success rate
      }

      const report = monitor.getHealthReport();

      expect(report.recommendations).toContain(
        'Low success rate detected - investigate connection or query issues'
      );
    });

    it('should generate recommendations for slow queries', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordQuery(1500, true); // Slow queries
      }

      const report = monitor.getHealthReport();

      expect(report.recommendations).toContain(
        'High average query time - consider query optimization'
      );
    });

    it('should generate recommendations for connection errors', () => {
      for (let i = 0; i < 8; i++) {
        monitor.recordConnectionError();
      }

      const report = monitor.getHealthReport();

      expect(report.recommendations).toContain(
        'Multiple connection errors detected - check database connectivity'
      );
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics to initial state', () => {
      // Record some data
      monitor.recordQuery(150, true);
      monitor.recordQuery(200, false);
      monitor.recordConnectionError();
      monitor.recordPoolExhaustion();

      monitor.resetMetrics();

      const metrics = monitor.getMetrics();

      expect(metrics.totalQueries).toBe(0);
      expect(metrics.successfulQueries).toBe(0