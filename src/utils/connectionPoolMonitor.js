const logger = require('./logger');

class ConnectionPoolMonitor {
  constructor(pool) {
    this.pool = pool;
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      maxQueryTime: 0,
      minQueryTime: Infinity,
      connectionErrors: 0,
      poolExhaustionEvents: 0,
      lastMetricsReset: new Date()
    };
    
    this.queryTimes = [];
    this.maxQueryTimesSample = 100; // Keep last 100 query times for average calculation
  }

  recordQuery(duration, success = true) {
    this.metrics.totalQueries++;
    
    if (success) {
      this.metrics.successfulQueries++;
    } else {
      this.metrics.failedQueries++;
    }

    // Track query timing
    this.queryTimes.push(duration);
    if (this.queryTimes.length > this.maxQueryTimesSample) {
      this.queryTimes.shift();
    }

    // Update min/max/average
    this.metrics.maxQueryTime = Math.max(this.metrics.maxQueryTime, duration);
    this.metrics.minQueryTime = Math.min(this.metrics.minQueryTime, duration);
    this.metrics.averageQueryTime = this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length;
  }

  recordConnectionError() {
    this.metrics.connectionErrors++;
    logger.error('Connection pool error recorded', {
      totalErrors: this.metrics.connectionErrors,
      poolStats: this.getPoolStats()
    });
  }

  recordPoolExhaustion() {
    this.metrics.poolExhaustionEvents++;
    logger.warn('Connection pool exhaustion event recorded', {
      totalEvents: this.metrics.poolExhaustionEvents,
      poolStats: this.getPoolStats()
    });
  }

  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.pool.options.max,
      minConnections: this.pool.options.min
    };
  }

  getMetrics() {
    const poolStats = this.getPoolStats();
    const utilizationRate = poolStats.totalCount / poolStats.maxConnections;
    const successRate = this.metrics.totalQueries > 0 
      ? (this.metrics.successfulQueries / this.metrics.totalQueries) * 100 
      : 100;

    return {
      ...this.metrics,
      poolStats,
      utilizationRate,
      successRate,
      isHealthy: this.assessHealth()
    };
  }

  assessHealth() {
    const poolStats = this.getPoolStats();
    const utilizationRate = poolStats.totalCount / poolStats.maxConnections;
    const successRate = this.metrics.totalQueries > 0 
      ? (this.metrics.successfulQueries / this.metrics.totalQueries) * 100 
      : 100;

    // Health criteria
    const isUtilizationHealthy = utilizationRate < 0.9; // Less than 90% utilization
    const isSuccessRateHealthy = successRate >= 95; // At least 95% success rate
    const isWaitingCountHealthy = poolStats.waitingCount < 5; // Less than 5 waiting connections
    const isConnectionErrorsHealthy = this.metrics.connectionErrors < 10; // Less than 10 connection errors

    return isUtilizationHealthy && isSuccessRateHealthy && isWaitingCountHealthy && isConnectionErrorsHealthy;
  }

  getHealthReport() {
    const metrics = this.getMetrics();
    const health = this.assessHealth();
    
    const report = {
      status: health ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      metrics,
      recommendations: []
    };

    // Add recommendations based on metrics
    if (metrics.utilizationRate > 0.8) {
      report.recommendations.push('Consider increasing max pool size - high utilization detected');
    }

    if (metrics.poolStats.waitingCount > 0) {
      report.recommendations.push('Connections are waiting - consider optimizing query performance or increasing pool size');
    }

    if (metrics.successRate < 95) {
      report.recommendations.push('Low success rate detected - investigate connection or query issues');
    }

    if (metrics.averageQueryTime > 1000) {
      report.recommendations.push('High average query time - consider query optimization');
    }

    if (metrics.connectionErrors > 5) {
      report.recommendations.push('Multiple connection errors detected - check database connectivity');
    }

    return report;
  }

  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      maxQueryTime: 0,
      minQueryTime: Infinity,
      connectionErrors: 0,
      poolExhaustionEvents: 0,
      lastMetricsReset: new Date()
    };
    this.queryTimes = [];
    
    logger.info('Connection pool metrics reset');
  }

  logMetrics() {
    const metrics = this.getMetrics();
    
    logger.info('Connection pool metrics', {
      totalQueries: metrics.totalQueries,
      successRate: `${metrics.successRate.toFixed(2)}%`,
      averageQueryTime: `${metrics.averageQueryTime.toFixed(2)}ms`,
      maxQueryTime: `${metrics.maxQueryTime}ms`,
      utilizationRate: `${(metrics.utilizationRate * 100).toFixed(2)}%`,
      poolStats: metrics.poolStats,
      isHealthy: metrics.isHealthy
    });
  }

  startPeriodicLogging(intervalMs = 300000) { // Default: 5 minutes
    this.loggingInterval = setInterval(() => {
      this.logMetrics();
    }, intervalMs);
    
    logger.info('Started periodic connection pool metrics logging', { intervalMs });
  }

  stopPeriodicLogging() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
      this.loggingInterval = null;
      logger.info('Stopped periodic connection pool metrics logging');
    }
  }
}

module.exports = ConnectionPoolMonitor;