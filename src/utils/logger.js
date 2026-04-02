const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const LOG_COLORS = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  debug: '\x1b[35m', // Magenta
  reset: '\x1b[0m'   // Reset
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
    this.enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true';
    this.logDirectory = path.join(process.cwd(), 'logs');
    this.maxLogFileSize = parseInt(process.env.MAX_LOG_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = parseInt(process.env.MAX_LOG_FILES) || 5;
    
    this.initializeLogDirectory();
  }

  initializeLogDirectory() {
    if (this.enableFileLogging && !fs.existsSync(this.logDirectory)) {
      try {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      } catch (error) {
        console.error('Failed to create log directory:', error.message);
        this.enableFileLogging = false;
      }
    }
  }

  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const correlationId = metadata.correlationId || uuidv4();
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      correlationId,
      pid: process.pid,
      ...metadata
    };

    // Remove sensitive information
    if (logEntry.password) delete logEntry.password;
    if (logEntry.token) delete logEntry.token;
    if (logEntry.authorization) delete logEntry.authorization;

    return logEntry;
  }

  formatConsoleMessage(logEntry) {
    const color = LOG_COLORS[logEntry.level.toLowerCase()] || '';
    const reset = LOG_COLORS.reset;
    
    let output = `${color}[${logEntry.timestamp}] ${logEntry.level}${reset}: ${logEntry.message}`;
    
    if (logEntry.correlationId) {
      output += ` (ID: ${logEntry.correlationId})`;
    }

    if (logEntry.error) {
      output += `\n${color}Error Details:${reset} ${logEntry.error}`;
    }

    if (logEntry.stack && process.env.NODE_ENV === 'development') {
      output += `\n${color}Stack:${reset}\n${logEntry.stack}`;
    }

    return output;
  }

  writeToFile(logEntry) {
    if (!this.enableFileLogging) return;

    const logFileName = `app-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(this.logDirectory, logFileName);
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      // Check file size before writing
      if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath);
        if (stats.size > this.maxLogFileSize) {
          this.rotateLogFile(logFilePath);
        }
      }

      fs.appendFileSync(logFilePath, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  rotateLogFile(logFilePath) {
    try {
      const logDir = path.dirname(logFilePath);
      const logFileName = path.basename(logFilePath, '.log');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFileName = `${logFileName}-${timestamp}.log`;
      const rotatedFilePath = path.join(logDir, rotatedFileName);

      fs.renameSync(logFilePath, rotatedFilePath);

      // Clean up old log files
      this.cleanupOldLogFiles(logDir);
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  cleanupOldLogFiles(logDir) {
    try {
      const files = fs.readdirSync(logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),