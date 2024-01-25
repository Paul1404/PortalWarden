require('dotenv').config();
const rpio = require('rpio');

function initHardware() {
    rpio.open(parseInt(process.env.SERVO_PIN), rpio.OUTPUT, rpio.LOW);
    rpio.open(parseInt(process.env.GREEN_LED_PIN), rpio.OUTPUT, rpio.LOW);
    rpio.open(parseInt(process.env.RED_LED_PIN), rpio.OUTPUT, rpio.LOW);
}

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
