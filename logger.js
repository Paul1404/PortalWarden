const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * Creates a logger instance for a given module.
 * 
 * The logger will write logs to the console and to two files: 'error.log' for error level logs
 * and 'combined.log' for all logs. Logs are stored in a directory structure under 'logs' directory.
 * The directory is named after the script file that uses the logger.
 * 
 * @param {string} modulePath - The file path of the module that requires logging.
 * @returns {winston.Logger} A Winston logger instance configured for the module.
 */
function createLogger(modulePath) {
    // Extract the base name of the script file for subdirectory naming
    const scriptName = path.basename(modulePath);
    const subDir = scriptName.replace(path.extname(scriptName), ''); // Remove file extension
  
    // Define the logs directory path with subdirectory
    const logsDir = path.join(__dirname, 'logs', subDir);
    if (!fs.existsSync(logsDir)){
      fs.mkdirSync(logsDir, { recursive: true });
    }
  
    // Define formats for console and file logging
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    );
  
    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    );
  
    // Create and return the logger
    const logger = winston.createLogger({
      level: 'info',
      format: fileFormat,
      transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
      ],
    });
  
    return logger;
  }

module.exports = createLogger;
