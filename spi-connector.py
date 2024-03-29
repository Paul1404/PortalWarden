import os
import sys
import time
import signal
import hashlib
import logging
from logging.handlers import RotatingFileHandler
import psycopg2
from datetime import datetime
from argon2 import PasswordHasher, exceptions
from decouple import config
import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522

# Initialize Argon2 PasswordHasher with tuned parameters
ph = PasswordHasher()

# Load the pin values from the .env file
GREEN_LED_PIN = int(config('GREEN_LED_PIN', default='2'))
RED_LED_PIN = int(config('RED_LED_PIN', default='3'))
SERVO_PIN = int(config('SERVO_PIN', default='12'))

# Initialize GPIO settings
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(SERVO_PIN, GPIO.OUT)
GPIO.setup(GREEN_LED_PIN, GPIO.OUT)
GPIO.setup(RED_LED_PIN, GPIO.OUT)
GPIO.output(RED_LED_PIN, GPIO.HIGH)


# Initialize PWM for Servo Control
servo = GPIO.PWM(SERVO_PIN, 50)  # 50Hz frequency
servo.start(0)  # Initialization with 0 duty cycle

def set_servo_angle(angle):
    duty = angle / 18 + 2
    servo.ChangeDutyCycle(duty)
    time.sleep(1)  # Allow time for the servo to move
    servo.ChangeDutyCycle(0)  # Stop sending a signal


def lock_door():
    set_servo_angle(0)  # Adjust this angle to securely lock
    logger.info("Door locked.")

def unlock_door():
    set_servo_angle(90)  # Adjust this angle to unlock
    logger.info("Door unlocked.")

# Configure logging
class InfoWarningStreamHandler(logging.StreamHandler):
    def __init__(self):
        super().__init__()
        self._stderr = sys.stderr
        self._stdout = sys.stdout

    def emit(self, record):
        if record.levelno >= logging.ERROR:
            self.stream = self._stderr
        else:
            self.stream = self._stdout
        super().emit(record)

def configure_logging():
    log_directory = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_directory, exist_ok=True)
    log_file = os.path.join(log_directory, "rfid_reader.log")

    handlers = [RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3)]

    if config('LOG_TO_CONSOLE', cast=bool, default=True):
        handlers.append(InfoWarningStreamHandler())

    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                        handlers=handlers)

    return logging.getLogger(__name__)

logger = configure_logging()

# Database Manager Class
class DatabaseManager:
    def __init__(self, dsn):
        self.dsn = dsn
        logger.info("DatabaseManager initialized with database connection string.")

    def insert_log(self, rfid_id, is_valid):
        try:
            with psycopg2.connect(self.dsn) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO \"RfidLog\" (\"rfidId\", \"isvalid\", \"timestamp\") VALUES (%s, %s, %s)",
                        (rfid_id, is_valid, datetime.now())
                    )
                    logger.info(f"RFID ID: {rfid_id} logged as {'valid' if is_valid else 'invalid'}.")
        except psycopg2.Error as e:
            logger.error(f"Database error when inserting log entry: {e.pgcode}: {e.pgerror}", exc_info=True)

    def check_validity(self, rfid_id):
        try:
            logger.info("Attempting to connect to the database for RFID validity check.")
            with psycopg2.connect(self.dsn) as conn:
                with conn.cursor() as cursor:
                    # Hash the RFID ID with SHA-256 for comparison
                    hash_rfid_id = hashlib.sha256(str(rfid_id).encode()).hexdigest()
                    logger.info(f"Hashed RFID ID: {hash_rfid_id}")
                    cursor.execute('SELECT EXISTS(SELECT 1 FROM "ValidTag" WHERE "tag" = %s)', (hash_rfid_id,))
                    exists = cursor.fetchone()[0]
                    logger.info(f"Tag exists: {exists}")
                    return exists
        except psycopg2.Error as e:
            logger.error(f"Database error when checking RFID validity: {e.pgcode}: {e.pgerror}", exc_info=True)
            return False

# RFID Reader Class
class RFIDReader:
    def __init__(self, db_manager):
        self.reader = SimpleMFRC522()
        self.db_manager = db_manager
        self.last_scan_time = None
        self.last_invalid_scan_time = None

    def read_rfid(self):
        logger.info("Attempting to read RFID...")

        try:
            id, text = self.reader.read_no_block()  # Attempt to read RFID tag
            if id:
                logger.info(f"RFID ID: {id} read. Text: '{text}'")  # Log successful read
                is_valid = self.db_manager.check_validity(id)  # Check validity of the RFID tag

                if is_valid:
                    logger.info("RFID code valid. Unlocking door...")
                    self.blink_led(GREEN_LED_PIN, duration=3)  # Blink green LED to indicate valid tag
                    unlock_door()  # Unlock the door
                    time.sleep(5)  # Keep the door unlocked for 5 seconds
                    lock_door()  # Lock the door
                    logger.info("Door re-locked.")
                else:
                    logger.warning("RFID code invalid. Access denied.")  # Log an invalid RFID attempt
                    self.blink_led(RED_LED_PIN, duration=3)  # Blink red LED to indicate invalid tag
                    GPIO.output(RED_LED_PIN, GPIO.HIGH)  # Ensure red LED is on after blinking
            else:
                logger.debug("No RFID tag detected.")  # Log if no tag is detected

        except Exception as e:
            logger.error(f"Error during RFID read or processing: {e}", exc_info=True)  # Log any exceptions with traceback

        time.sleep(1)  # Delay between attempts to prevent rapid-fire reading



    def cleanup(self):
        try:
            servo.stop()
            GPIO.cleanup()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


    def blink_led(self, pin, duration=2, on_time=0.5, off_time=0.5):
        end_time = time.time() + duration
        while time.time() < end_time:
            GPIO.output(pin, GPIO.HIGH)
            time.sleep(on_time)
            GPIO.output(pin, GPIO.LOW)
            time.sleep(off_time)

def setup_leds():
    GPIO.output(RED_LED_PIN, GPIO.HIGH)  # Red LED on, indicating system is active
    GPIO.output(GREEN_LED_PIN, GPIO.LOW)  # Ensure green LED is off

def signal_handler(sig, frame, reader):
    reader.cleanup()
    logger.info("Graceful shutdown initiated")
    sys.exit(0)

if __name__ == "__main__":
    setup_leds()

    dsn = config('DATABASE_URL', default='CHANGEME')
    db_manager = DatabaseManager(dsn)
    reader = RFIDReader(db_manager)

    signal.signal(signal.SIGINT, lambda sig, frame: signal_handler(sig, frame, reader))
    signal.signal(signal.SIGTERM, lambda sig, frame: signal_handler(sig, frame, reader))

    logger.info("Script start, entering main loop")
    try:
        while True:
            reader.read_rfid()
    except KeyboardInterrupt:
        pass
    finally:
        GPIO.cleanup()
