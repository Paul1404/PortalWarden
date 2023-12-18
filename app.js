const { exec } = require('child_process');
const Database = require('./db');
const { initHardware, controlServoAndLEDs } = require('./hardwareControl');

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

async function main() {
    const db = new Database();
    initHardware();

    console.log('Node.js program started.');

    // Run the Python script
    runPythonScript();

    // Handling SIGINT
    process.on('SIGINT', async () => {
        await db.close();
        process.exit(0);
    });
}

main();
