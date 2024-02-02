import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
import time
import logging
import psycopg2
from datetime import datetime
from argon2 import PasswordHasher
import os
from decouple import config
import signal
import sys
from argon2.exceptions import VerifyMismatchError

# Initialize Argon2 PasswordHasher
ph = PasswordHasher()

last_invalid_scan_time = None  # Track the time of the last invalid RFID scan

# Load the pin values from the .env file
GREEN_LED_PIN = int(config('GREEN_LED_PIN', default='5'))
RED_LED_PIN = int(config('RED_LED_PIN', default='3'))

# Initialize GPIO settings
GPIO.setmode(GPIO.BCM)
GPIO.setup(GREEN_LED_PIN, GPIO.OUT)
GPIO.setup(RED_LED_PIN, GPIO.OUT)

def configure_logging():
    # Get the directory of the current script
    script_dir = os.path.dirname(os.path.realpath(__file__))
    # Construct the log directory path
    log_directory = os.path.join(script_dir, "..", "logs", "spi-connector")
    log_file = "rfid_reader.log"
    full_log_path = os.path.join(log_directory, log_file)

    # Check if the directory exists, and create it if it doesn't
    if not os.path.exists(log_directory):
        os.makedirs(log_directory)

    # Create a logger
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)

    # Create a file handler
    file_handler = logging.FileHandler(full_log_path)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(message)s'))

    # Add the file handler to the logger
    logger.addHandler(file_handler)

    # Check if console logging is enabled
    if config('LOG_TO_CONSOLE', default='False', cast=bool):
        # Create a console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(message)s'))

        # Add the console handler to the logger
        logger.addHandler(console_handler)

    return logger

logger = configure_logging()

# Database Manager Class
class DatabaseManager:
    def __init__(self):
        self.db_config = {
            "host": config('DB_HOST', default='localhost'),
            "dbname": config('DB_NAME', default='access-control'),
            "user": config('DB_USER', default='admin'),
            "password": config('DB_PASSWORD', default='raspberrypi12')
        }

    def insert_log(self, rfid_id):
        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        'INSERT INTO "RfidLog" ("rfidId", "timestamp") VALUES (%s, %s)',
                        (rfid_id, datetime.now())
                    )
                    logger.info(f"Log entry for RFID ID: {rfid_id} inserted.")
        except psycopg2.Error as e:
            logger.error(f"Database error when inserting log entry: {e}")

    def check_validity(self, rfid_id):
        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT "tag" FROM "ValidTag"')
                    retrieved_hashes = cursor.fetchall()

                    for database_hash in retrieved_hashes:
                        try:
                            if ph.verify(database_hash[0], str(rfid_id)):
                                logger.info(f"RFID ID {rfid_id} is valid.")
                                return True
                        except VerifyMismatchError:
                            continue  # This specific tag does not match, continue checking others

                    # If we reach this point, no hashes matched the RFID tag
                    logger.info(f"RFID ID {rfid_id} is not valid.")
                    return False
        except psycopg2.Error as e:
            logger.error(f"Database error when checking RFID validity: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error when checking RFID validity: {e}")
            return False

# RFID Reader Class
class RFIDReader:
    def __init__(self):
        self.reader = SimpleMFRC522()
        self.db_manager = DatabaseManager()

    def read_rfid(self):
        global last_invalid_scan_time
        try:
            id, _ = self.reader.read_no_block()
            if id:
                logger.info(f"RFID ID: {id}")
                if self.db_manager.check_validity(id):
                    logger.info("RFID ID is valid and will be logged.")
                    self.db_manager.insert_log(id)
                    turn_on_led(GREEN_LED_PIN)
                    turn_off_led(RED_LED_PIN)  # Ensure red LED is off if the tag is valid
                    last_invalid_scan_time = None  # Reset the invalid scan tracker
                    time.sleep(5)  # Provide visible feedback for a valid tag
                else:
                    logger.info("RFID ID is not valid.")
                    turn_on_led(RED_LED_PIN)  # Turn on red LED for invalid tag
                    last_invalid_scan_time = time.time()  # Update the last invalid scan time
                    # Removed turning off the green LED here to maintain state
                    time.sleep(5)  # Provide visible feedback for an invalid tag
            else:
                logger.info("No RFID tag detected.")
                # Check if it's time to reset the LEDs based on the last invalid scan time
                if last_invalid_scan_time and (time.time() - last_invalid_scan_time > 10):
                    # It's been more than 10 seconds since the last invalid scan, reset LEDs
                    turn_off_led(GREEN_LED_PIN)
                    turn_off_led(RED_LED_PIN)
                    last_invalid_scan_time = None  # Reset the invalid scan tracker
                # If no need to reset LEDs yet, do not turn them off immediately

            time.sleep(1)  # Short delay to debounce and manage rapid tag presentations

        except Exception as e:
            logger.error(f"An error occurred while reading RFID: {e}")


    def close(self):
        GPIO.cleanup()

# Helper Functions
def turn_on_led(pin):
    logger.info(f"Turning on LED on pin {pin}")
    GPIO.output(pin, GPIO.HIGH)

def turn_off_led(pin):
    logger.info(f"Turning off LED on pin {pin}")
    GPIO.output(pin, GPIO.LOW)

def signal_handler(sig, frame):
    logger.info("Graceful shutdown initiated")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    reader = RFIDReader()
    try:
        while True:
            reader.read_rfid()
    except KeyboardInterrupt:
        logger.info("RFID reading interrupted")
    finally:
        reader.close()
