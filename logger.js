const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PrismaTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Correctly convert and format the timestamp for the desired timezone
    const timestamp = moment().tz("Europe/Berlin").format();

    try {
      await prisma.logEntry.create({
        data: {
          level: info.level,
          message: info.message,
          timestamp: new Date(timestamp),
        },
      });
      callback();
    } catch (err) {
      console.error('Error logging to database:', err);
      callback(err);
    }
  }
}

function createLogger(modulePath) {
  const scriptName = path.basename(modulePath);
  const logsDir = path.join(__dirname, 'logs', scriptName.replace(path.extname(scriptName), ''));

  if (!fs.existsSync(logsDir)){
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message }) => {
      const timestamp = moment().tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');
      return `${timestamp} ${level}: ${message}`;
    })
  );

  const fileFormat = winston.format.combine(
    winston.format.printf(({ level, message }) => {
      const timestamp = moment().tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');
      return `${timestamp} ${level}: ${message}`;
    })
  );

  return winston.createLogger({
    level: 'info',
    transports: [
      new winston.transports.Console({
        format: consoleFormat
      }),
      new DailyRotateFile({
        filename: path.join(logsDir, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: fileFormat, // Use non-colorized format for files
      }),
      new PrismaTransport(),
    ],
  });
}

module.exports = createLogger;
