import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
import time
import logging
from logging.handlers import RotatingFileHandler
import psycopg2
from datetime import datetime
from argon2 import PasswordHasher
import os
from decouple import config
import signal
import sys
from argon2.exceptions import VerifyMismatchError

# Initialize Argon2 PasswordHasher with tuned parameters
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
    script_dir = os.path.dirname(os.path.realpath(__file__))
    log_directory = os.path.join(script_dir, "..", "logs", "spi-connector")
    log_file = "rfid_reader.log"
    full_log_path = os.path.join(log_directory, log_file)

    if not os.path.exists(log_directory):
        os.makedirs(log_directory)

    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)

    # Setup log rotation: max 5 MB per file, keep 3 old logs
    file_handler = RotatingFileHandler(full_log_path, maxBytes=5*1024*1024, backupCount=3)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(message)s'))
    logger.addHandler(file_handler)

    if config('LOG_TO_CONSOLE', default='False', cast=bool):
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(message)s'))
        logger.addHandler(console_handler)

    return logger

logger = configure_logging()

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
        hash_rfid_id = ph.hash(str(rfid_id))  # Hashing RFID ID for comparison
        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT "tag" FROM "ValidTag" WHERE "tag" = %s', (hash_rfid_id,))
                    if cursor.fetchone():
                        logger.info(f"RFID ID {rfid_id} is valid.")
                        return True
                    else:
                        logger.info(f"RFID ID {rfid_id} is not valid.")
                        return False
        except psycopg2.Error as e:
            logger.error(f"Database error when checking RFID validity: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error when checking RFID validity: {e}")
            return False

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
                    turn_off_led(RED_LED_PIN)
                    last_invalid_scan_time = None
                    time.sleep(5)
                else:
                    logger.info("RFID ID is not valid.")
                    turn_on_led(RED_LED_PIN)
                    last_invalid_scan_time = time.time()
                    time.sleep(5)
            else:
                if last_invalid_scan_time and (time.time() - last_invalid_scan_time > 10):
                    turn_off_led(GREEN_LED_PIN)
                    turn_off_led(RED_LED_PIN)
                    last_invalid_scan_time = None
            time.sleep(1)
        except Exception as e:
            logger.error(f"An error occurred while reading RFID: {e}")

    def close(self):
        GPIO.cleanup()

def turn_on_led(pin):
    GPIO.output(pin, GPIO.HIGH)

def turn_off_led(pin):
    GPIO.output(pin, GPIO.LOW)

def signal_handler(sig, frame):
    reader.close()
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
