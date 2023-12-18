const rpio = require('rpio');
const config = require('./config');

/**
 * Initializes the hardware components by setting the GPIO pins.
 * This includes setting up the servo motor and LED pins.
 */
function initHardware() {
    rpio.open(config.servoPin, rpio.OUTPUT, rpio.LOW);
    rpio.open(config.greenLedPin, rpio.OUTPUT, rpio.LOW);
    rpio.open(config.redLedPin, rpio.OUTPUT, rpio.LOW);
}

/**
 * Controls the servo motor and LEDs based on the RFID value.
 * Moves the servo motor and turns on the green LED if RFID is valid,
 * otherwise turns on the red LED.
 * @param {boolean} rfidValue - The value indicating RFID tag validity.
 */
function controlServoAndLEDs(rfidValue) {
    // Move the servo motor
    rpio.write(config.servoPin, rpio.HIGH);
    rpio.usleep(config.pulseWidth);
    rpio.write(config.servoPin, rpio.LOW);
    rpio.msleep(20); // Wait for 20 milliseconds

    // Control LEDs based on RFID value
    if (rfidValue) {
        rpio.write(config.greenLedPin, rpio.HIGH); // Turn on green LED
        rpio.write(config.redLedPin, rpio.LOW); // Turn off red LED
    } else {
        rpio.write(config.greenLedPin, rpio.LOW); // Turn off green LED
        rpio.write(config.redLedPin, rpio.HIGH); // Turn on red LED
    }
}

module.exports = { initHardware, controlServoAndLEDs };
