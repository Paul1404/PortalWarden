const { exec } = require('child_process');
const Database = require('./db');
const { initHardware, controlServoAndLEDs } = require('./hardwareControl');
const readline = require('readline');
const winston = require('winston');
const path = require('path');

// Configure Winston logger
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

async function gracefulShutdown(db) {
    await db.close();
    logger.info('Database connection closed.');
    process.exit(0);
}

async function main() {
    const db = new Database();
    initHardware();

    logger.info('Node.js program started.');

    // Run the Python script
    runPythonScript();

    // Setup keypress listener for Ctrl+X
    setupKeypressListener(db);
}

main();
