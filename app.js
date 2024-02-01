const { spawn, exec } = require('child_process');
const readline = require('readline');
const createLogger = require('./logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const logger = createLogger(__filename);

// Environment Variables
const PYTHON_SCRIPT = process.env.PYTHON_SCRIPT || 'spi-connector.py';
const SERVER_SCRIPT = process.env.SERVER_SCRIPT || 'webserver.js';

/**
 * Starts the Node.js server using a child process.
 * 
 * This function spawns a child process to run the server script specified
 * by the SERVER_SCRIPT environment variable. It logs the standard output
 * and standard error of the server process to help with debugging.
 * Additionally, it captures the server's output, which can be used for
 * further analysis or logging. If the server process fails to start, it
 * logs the error. When the server process exits, it logs the exit code
 * and the captured output.
 */
function startServer() {
    const server = spawn('node', [SERVER_SCRIPT], { stdio: 'pipe' });

    let serverOutput = '';

    server.stdout.on('data', (data) => {
        serverOutput += data;
    });

    server.stderr.on('data', (data) => {
        logger.error(`Server Error: ${data.toString()}`);
    });

    server.on('close', (code) => {
        logger.info(`Server process exited with code ${code}`);
        logger.info(`Server Output: ${serverOutput}`);
    });

    server.on('error', (err) => {
        logger.error(`Failed to start server: ${err}`);
    });
}


/**
 * Executes a Python script to read RFID data.
 *
 * This function uses a child process to run the Python script specified
 * by the PYTHON_SCRIPT environment variable. It collects and buffers the
 * standard output (stdout) and standard error (stderr) of the Python process.
 * - The standard output is logged as informational data.
 * - The standard error is logged as an error.
 * If the Python process fails to start, it logs the error.
 * Upon closing of the Python process, it logs the exit code along with
 * the buffered output.
 */
function runPythonScript() {
    const pythonProcess = exec(`python3 ${PYTHON_SCRIPT}`);

    let pythonOutput = '';

    pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data;
    });

    pythonProcess.stderr.on('data', (data) => {
        logger.error(`Python Error: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
        logger.info(`Python script exited with code ${code}`);
        logger.info(`Python Output: ${pythonOutput}`);
    });

    pythonProcess.on('error', (err) => {
        logger.error(`Failed to start Python script: ${err}`);
    });
}


/**
 * Sets up a keypress listener on the standard input (stdin) to handle a specific
 * key combination (Ctrl+X) for initiating a graceful shutdown of the application.
 *
 * When the specified key combination is detected, the function logs the event and
 * calls the gracefulShutdown function to handle the shutdown process.
 */
function setupKeypressListener() {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', async (str, key) => {
        if (key.ctrl && key.name === 'x') {
            logger.info('Ctrl+X pressed. Initiating shutdown...');
            await gracefulShutdown();
        }
    });
}


/**
 * Handles the graceful shutdown of the application.
 *
 * This function attempts to close the database connection using Prisma's
 * $disconnect method. It logs information about the disconnection and any
 * potential errors that occur during the process. Finally, it exits the
 * process with a status code of 0, indicating a normal termination.
 */
async function gracefulShutdown() {
    try {
        await db.disconnect();
        logger.info('Database connection closed.');
    } catch (error) {
        logger.error('Error closing database connection:', error);
    }
    process.exit(0);
}


/**
 * Sets up signal handlers to gracefully shut down the application.
 *
 * This function listens for system signals:
 * - SIGINT (typically triggered by Ctrl+C in the terminal), and
 * - SIGTERM (sent by system shutdown commands).
 *
 * When either of these signals is received, the function logs the event
 * and initiates the graceful shutdown process by calling the gracefulShutdown
 * function.
 */
function setupSignalHandlers() {
    process.on('SIGINT', async () => {
        logger.info('SIGINT received. Initiating shutdown...');
        await gracefulShutdown();
    });

    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received. Initiating shutdown...');
        await gracefulShutdown();
    });
}


/**
 * The main function of the application.
 * 
 * This function is the entry point of the application. It performs the following tasks:
 * 1. Establishes a database connection using Prisma.
 * 2. Starts the Node.js server and the Python script for RFID reading.
 * 3. Sets up listeners for keypress events and system signals for graceful shutdown.
 * 
 * If an error occurs during any of these operations, it logs the error and initiates
 * a graceful shutdown of the application.
 */
async function main() {
    try {
        // Validate database connection
        await prisma.$connect();
        logger.info('Database connection established.');

        // Start the server and Python script
        startServer();
        runPythonScript();

        // Setup keypress and signal listeners
        setupKeypressListener();
        setupSignalHandlers();
    } catch (error) {
        logger.error('An error occurred in the main function:', error);
        await gracefulShutdown();
    }
}


main();
