const rpio = require('rpio');
const rc522 = require('node-rc522');
const sqlite3 = require('sqlite3').verbose();

/**
 * Initialize the SQLite database.
 * Creates a new database named 'rfidTags.db' and a table 'valid_tags' if they don't exist.
 */
const db = new sqlite3.Database('rfidTags.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the RFID tags database.');

    db.run(`CREATE TABLE IF NOT EXISTS valid_tags (
        id INTEGER PRIMARY KEY,
        tag TEXT NOT NULL UNIQUE
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });
});

/**
 * Checks if the RFID tag is valid and controls the servo motor.
 * @param {string} tagUid - The UID of the RFID tag.
 */
function checkAndControl(tagUid) {
    db.get('SELECT tag FROM valid_tags WHERE tag = ?', [tagUid], (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }
        if (row) {
            console.log("Valid tag detected:", tagUid);
            controlServo();
        } else {
            console.log("Invalid tag detected:", tagUid);
        }
    });
}

/**
 * Initializes the RFID-RC522 sensor.
 */
function initRFID() {
    rc522.init();
}

/**
 * Reads the RFID tag.
 * Calls checkAndControl function with the tag UID.
 */
function readRFID() {
    rc522.read(function(tagUid){
        if (tagUid) {
            checkAndControl(tagUid);
        }
    });
}

/**
 * Controls the servo motor.
 * Activates the servo motor to move to a specified position.
 */
function controlServo() {
    const servoPin = 12; // Pin where the servo motor is connected
    rpio.open(servoPin, rpio.OUTPUT, rpio.LOW);

    // Move the servo motor
    const pulseWidth = 1500; // Pulse width in microseconds
    rpio.write(servoPin, rpio.HIGH);
    rpio.usleep(pulseWidth);
    rpio.write(servoPin, rpio.LOW);
    rpio.msleep(20); // Wait for 20 milliseconds
}

/**
 * Main function to start the program.
 * Initializes the RFID sensor and periodically checks for RFID tags.
 */
function main() {
    console.log('Program started. Waiting for RFID tag...');
    initRFID();
    setInterval(readRFID, 500); // Check for RFID tag every 500 milliseconds
}

// Start the program
main();

/**
 * Closes the database connection when the program is terminated.
 */
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Close the database connection.');
    });
});
