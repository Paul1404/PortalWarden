const winston = require('winston');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Custom Winston transport for logging to a Prisma-based database.
 */
class PrismaTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Adjust timestamp to  specific timezone, 'Europe/Berlin'
    const timestamp = moment().tz("Europe/Berlin").format();

    try {
      await prisma.logEntry.create({
        data: {
          level: info.level,
          message: info.message,
          timestamp,
        },
      });
      callback();
    } catch (err) {
      console.error('Error logging to database:', err);
      callback(err);
    }
  }
}

/**
 * Creates a logger instance configured with console, file, and Prisma transports.
 * @param {string} modulePath Path to the module creating the logger.
 * @returns {winston.Logger} Configured Winston logger instance.
 */
function createLogger(modulePath) {
  const scriptName = path.basename(modulePath);
  const subDir = scriptName.replace(path.extname(scriptName), '');

  const logsDir = path.join(__dirname, 'logs', subDir);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  );

  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    );

  // Adjust the logger level based on environment
  const level = process.env.LOG_LEVEL || 'info';

  return winston.createLogger({
    level,
    format: fileFormat,
    transports: [
      new winston.transports.Console({ format: consoleFormat }),
      new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
      new PrismaTransport(), // Add the custom Prisma transport
      ],
  });
}

module.exports = createLogger;
