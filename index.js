const { spawn } = require('child_process');
const { Gpio } = require('onoff');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Define the LED GPIO pins
const ledGreen = new Gpio(5, 'out'); // Update this pin according to your hardware setup
const ledRed = new Gpio(3, 'out'); // Update this pin according to your hardware setup

// Database file path
const dbFilePath = 'rfidDatabase.db';

// Function to initialize the database
function initDb() {
  const db = new sqlite3.Database(dbFilePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    }
    console.log('Connected to the SQLite database.');

    // Database initialization logic here (e.g., creating tables)
  });
  return db;
}

// Check if the database file exists and initialize the database
if (!fs.existsSync(dbFilePath)) {
  console.log('Database file not found. Creating new database...');
  initDb();
} else {
  console.log('Database file found. Connecting...');
  initDb();
}


// Function to check the RFID code against the SQLite database
function checkRFID(code) {
  db.get('SELECT * FROM rfidTable WHERE rfidCode = ?', [code], (err, row) => {
    if (err) {
      console.error(err.message);
      throw err;
    }
    
    if (row) {
      console.log(`RFID code ${code} is authorized.`);
      ledGreen.writeSync(1);
      ledRed.writeSync(0);
    } else {
      console.log(`RFID code ${code} is not authorized.`);
      ledGreen.writeSync(0);
      ledRed.writeSync(1);
    }

    // Reset LEDs after 5 seconds
    setTimeout(() => {
      ledGreen.writeSync(0);
      ledRed.writeSync(0);
    }, 5000);
  });
}

// Start the Python process to read RFID tags
const pythonProcess = spawn('python', ['read_rfid.py']);

pythonProcess.stdout.on('data', (data) => {
  const rfidCode = data.toString().trim();
  console.log(`RFID Code Read: ${rfidCode}`);
  checkRFID(rfidCode);
});

pythonProcess.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

pythonProcess.on('close', (code) => {
  ledGreen.unexport();
  ledRed.unexport();
  db.close();
  console.log(`Python process exited with code ${code}`);
});

// Handle clean up on application exit
process.on('SIGINT', () => {
  ledGreen.unexport();
  ledRed.unexport();
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection and cleaned up GPIO.');
    process.exit();
  });
});

