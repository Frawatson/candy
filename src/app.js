const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { databaseMiddleware, requireDatabaseConnection, databaseMonitoringMiddleware } = require('./middleware/database');
const asyncHandler = require('./middleware/asyncHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const refreshRoutes = require('./routes/auth/refresh');

// Import utilities
const logger = require('./utils/logger');
const { initializeDatabase, closeDatabase } = require('./database/connection');
const { performHealthCheck, createHealthCheckMiddleware } = require('./utils/databaseHealth');

// Import Swagger documentation
const swaggerSetup = require('./docs/swagger');

const app = express();

// Initialize database connection
let isShuttingDown = false;

async function initializeApp() {
  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    await initializeDatabase();
    logger.info('Database connection established successfully');

    // Perform initial health check
    const healthCheck = await performHealthCheck();
    if (!healthCheck.healthy) {
      logger.warn('Database health check failed during startup', healthCheck);
    } else {
      logger.info('Database health check passed');
    }
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database middleware
app.use(databaseMonitoringMiddleware());
app.use(databaseMiddleware());

// Health check endpoints
app.get('/health', asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
}));

app.get('/health/database', createHealthCheckMiddleware());

app.get('/health/detailed', asyncHandler(async (req, res) => {
  const healthCheck = await performHealthCheck();
  
  const detailedHealth = {
    status: healthCheck.healthy ? 'healthy' : 'unhealthy',
    timestamp: healthCheck.timestamp,
    checks: {
      application: {
        healthy: true,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      },
      database: healthCheck
    }
  };

  const statusCode = healthCheck.healthy ? 200 : 503;
  res.status(statusCode).json(detailedHealth);
}));

// Swagger documentation
swaggerSetup(app);

// API routes with database connection requirement
app.use('/api/auth', requireDatabaseConnection(), authRoutes);
app.use('/api/auth', requireDatabaseConnection(), refreshRoutes);
app.use('/api/users', requireDatabaseConnection(), userRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Express API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'A secure Express.js API with PostgreSQL database',
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      auth: '/api/auth',
      users: '/api/users'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Set timeout for forceful shutdown
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout. Forcing exit.');
    process.exit(1);
  }, 30000); // 30 seconds

  try {
    // Close database connections
    logger.info('Closing database connections...');
    await closeDatabase();
    logger.info('Database connections closed');
    
    // Clear timeout and exit
    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  
  initializeApp().then(() => {
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });
  }).catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
} else {
  // Export app for testing without starting server
  module.exports = { app, initializeApp };
}

module.exports = app;