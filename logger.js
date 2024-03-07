const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const moment = require('moment-timezone'); // Use moment-timezone for time adjustments

const prisma = new PrismaClient();

// Custom Winston transport for logging to a Prisma-based database
class PrismaTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.prisma = new PrismaClient(); // Use a dedicated PrismaClient instance for the transport
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Log to the database
    this.prisma.logEntry.create({
      data: {
        level: info.level,
        message: info.message,
        // Timestamp will be automatically added by Prisma
      },
    }).then(() => {
      if (callback) callback(null, true);
    }).catch(err => {
      console.error('Error logging to database:', err);
      if (callback) callback(err);
    });
  }
}

function createLogger(modulePath) {
  const scriptName = path.basename(modulePath);
  const subDir = scriptName.replace(path.extname(scriptName), '');

  const logsDir = path.join(__dirname, 'logs', subDir);
  if (!fs.existsSync(logsDir)){
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timezone = 'Europe/Berlin'; // Specify your time zone

  // Custom timestamp format that adjusts for the specified time zone
  const timestampFormat = winston.format((info) => {
    info.timestamp = moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss');
    return info;
  })();

  const consoleFormat = winston.format.combine(
    timestampFormat,
    winston.format.colorize(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    );

  const fileFormat = winston.format.combine(
    timestampFormat,
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    );

  return winston.createLogger({
    level: 'info',
    transports: [
      new winston.transports.Console({format: consoleFormat}),
      new winston.transports.File({filename: path.join(logsDir, 'error.log'), level: 'error'}),
      new winston.transports.File({filename: path.join(logsDir, 'combined.log')}),
      new PrismaTransport(),
      ],
  });
}

module.exports = createLogger;
