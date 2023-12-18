const { exec } = require('child_process');
const Database = require('./db');
const { initHardware, controlServoAndLEDs } = require('./hardwareControl');
const readline = require('readline');

function runPythonScript() {
    const pythonProcess = exec('python3 read_rfid.py', (err, stdout, stderr) => {
        if (err) {
            console.error('Error executing read_rfid.py:', err);
            return;
        }
        if (stdout) console.log(`Python stdout: ${stdout}`);
        if (stderr) console.error(`Python stderr: ${stderr}`);
    });

    pythonProcess.on('exit', (code, signal) => {
        console.log(`Python script exited with code ${code} and signal ${signal}`);
    });
}

function setupKeypressListener(db) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', async (str, key) => {
        if (key.ctrl && key.name === 'x') {
            console.log('Ctrl+X pressed. Shutting down...');
            await gracefulShutdown(db);
        }
    });
}

async function gracefulShutdown(db) {
    await db.close();
    console.log('Database connection closed.');
    process.exit(0);
}

async function main() {
    const db = new Database();
    initHardware();

    console.log('Node.js program started.');

    // Run the Python script
    runPythonScript();

    // Setup keypress listener for Ctrl+X
    setupKeypressListener(db);
}

main();
