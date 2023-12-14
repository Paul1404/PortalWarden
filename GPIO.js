const rpio = require('rpio');
const rc522 = require('node-rc522');

/**
 * Initialize the RFID-RC522 sensor
 */
function initRFID() {
    rc522.init();
}

/**
 * Read the RFID tag.
 * If a tag is detected, it will activate the servo motor.
 */
function readRFID() {
    rc522.read(function(tagUid){
        if (tagUid) {
            console.log("Tag detected:", tagUid);
            controlServo();
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
 */
function main() {
    console.log('Program started. Waiting for RFID tag...');
    initRFID();
    setInterval(readRFID, 500); // Check for RFID tag every 500 milliseconds
}

// Start the program
main();
