require('dotenv').config();
const rpio = require('rpio');

/**
 * Initializes hardware components by setting up the GPIO pins.
 * This function configures the pins for the servo motor and two LEDs (green and red) as output pins.
 * It also sets their initial states to LOW (off).
 */
function initHardware() {
    rpio.open(parseInt(process.env.SERVO_PIN), rpio.OUTPUT, rpio.LOW);
    rpio.open(parseInt(process.env.GREEN_LED_PIN), rpio.OUTPUT, rpio.LOW);
    rpio.open(parseInt(process.env.RED_LED_PIN), rpio.OUTPUT, rpio.LOW);
}

/**
 * Controls a servo motor and LEDs based on an RFID value.
 * 
 * The servo motor is activated for a duration defined in the environment variable PULSE_WIDTH.
 * After the servo operation, the function controls two LEDs:
 * - If the RFID value is truthy, the green LED is turned on and the red LED is turned off.
 * - If the RFID value is falsy, the green LED is turned off and the red LED is turned on.
 * 
 * @param {boolean} rfidValue - The value obtained from an RFID reader, used to control the LEDs.
 */
function controlServoAndLEDs(rfidValue) {
    // Move the servo motor
    rpio.write(parseInt(process.env.SERVO_PIN), rpio.HIGH);
    rpio.usleep(parseInt(process.env.PULSE_WIDTH));
    rpio.write(parseInt(process.env.SERVO_PIN), rpio.LOW);
    rpio.msleep(20); // Wait for 20 milliseconds

    // Control LEDs based on RFID value
    if (rfidValue) {
        rpio.write(parseInt(process.env.GREEN_LED_PIN), rpio.HIGH); // Turn on green LED
        rpio.write(parseInt(process.env.RED_LED_PIN), rpio.LOW); // Turn off red LED
    } else {
        rpio.write(parseInt(process.env.GREEN_LED_PIN), rpio.LOW); // Turn off green LED
        rpio.write(parseInt(process.env.RED_LED_PIN), rpio.HIGH); // Turn on red LED
    }
}

module.exports = { initHardware, controlServoAndLEDs };
