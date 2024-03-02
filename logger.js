const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Custom Winston transport for logging to a Prisma-based database
class PrismaTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Log to the database
    prisma.logEntry.create({
      data: {
        level: info.level,
        message: info.message,
        // Timestamp will be automatically added by Prisma
      },
    }).then(() => {
      callback();
    }).catch(err => {
      console.error('Error logging to database:', err);
      callback(err);
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
  
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    );
  
    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    );
  
    return winston.createLogger({
        level: 'info',
        format: fileFormat,
        transports: [
            new winston.transports.Console({format: consoleFormat}),
            new winston.transports.File({filename: path.join(logsDir, 'error.log'), level: 'error'}),
            new winston.transports.File({filename: path.join(logsDir, 'combined.log')}),
            new PrismaTransport(), // Add the custom Prisma transport
        ],
    });
}

module.exports = createLogger;
