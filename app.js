const { exec } = require('child_process');
const Database = require('./db');
const { initHardware, controlServoAndLEDs } = require('./hardwareControl');
const readline = require('readline');
const winston = require('winston');
const path = require('path');

/**
 * Configure Winston logger for application logging.
 * It logs info level and error level messages in separate files.
 */
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, 'logs', 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(__dirname, 'logs', 'combined.log') })
    ]
});

/**
 * Executes a Python script to read RFID data.
 * Logs the output or error to the Winston logger.
 */
function runPythonScript() {
    const pythonProcess = exec('python3 read_rfid.py', (err, stdout, stderr) => {
        if (err) {
            logger.error('Error executing read_rfid.py:', err);
            return;
        }
        if (stdout) logger.info(`Python stdout: ${stdout}`);
        if (stderr) logger.error(`Python stderr: ${stderr}`);
    });

    pythonProcess.on('exit', (code, signal) => {
        logger.info(`Python script exited with code ${code} and signal ${signal}`);
    });
}

/**
 * Sets up a keypress listener to handle Ctrl+X for a graceful shutdown.
 * @param {Database} db - The database connection to close on shutdown.
 */
function setupKeypressListener(db) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', async (str, key) => {
        if (key.ctrl && key.name === 'x') {
            logger.info('Ctrl+X pressed. Initiating shutdown...');
            await gracefulShutdown(db);
        }
    });
}

/**
 * Handles the graceful shutdown of the application.
 * Closes the database connection and exits the process.
 * @param {Database} db - The database connection to close.
 */
async function gracefulShutdown(db) {
    await db.close();
    logger.info('Database connection closed.');
    process.exit(0);
}

/**
 * The main function of the application.
 * It initializes the hardware, sets up the keypress listener, and starts the Python script.
 */
async function main() {
    const db = new Database();
    initHardware();

    logger.info('Node.js program started.');

    runPythonScript();
    setupKeypressListener(db);
}

main();
