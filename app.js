const { spawn } = require('child_process');
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

// Function to start server.js
function startServer() {
    const server = spawn('node', ['server.js']);

    server.stdout.on('data', (data) => {
        logger.info(`Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logger.error(`Server Error: ${data}`);
    });

    server.on('close', (code) => {
        logger.info(`Server process exited with code ${code}`);
    });
}

/**
 * Executes a Python script to read RFID data.
 * Logs the output or error to the Winston logger.
 */
function runPythonScript() {
    const pythonProcess = exec('python3 spi-connector.py', (err, stdout, stderr) => {
        if (err) {
            logger.error('Error executing spi-connector.py:', err);
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

    // Check for command line arguments for RFID ID
    // Example: npm run insert-rfid -- 123456789
    const args = process.argv.slice(2); // Skip the first two elements
    if (args.length > 0) {
        const rfidId = args[0];
        try {
            await db.insertRfidTag(rfidId);
            logger.info(`RFID ID ${rfidId} inserted into the database.`);
        } catch (error) {
            logger.error('Error inserting RFID ID into database:', error);
        }
    } else {
        runPythonScript();
        setupKeypressListener(db);
    }
}

main();
