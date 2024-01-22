const winston = require('winston');
const path = require('path');
const fs = require('fs');

function createLogger(modulePath) {
  const subDir = path.basename(path.dirname(modulePath));
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

  const logger = winston.createLogger({
    level: 'info',
    format: fileFormat,
    transports: [
      new winston.transports.Console({
        format: consoleFormat
      }),
      new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
    ],
  });

  return logger;
}

module.exports = createLogger;
