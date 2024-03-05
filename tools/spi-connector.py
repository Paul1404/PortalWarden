import os
import sys
import time
import signal
import logging
from logging.handlers import RotatingFileHandler
import psycopg2
from datetime import datetime
from argon2 import PasswordHasher, exceptions
from decouple import config
import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522


# Configure logging
def configure_logging():
    log_directory = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_directory, exist_ok=True)
    log_file = os.path.join(log_directory, "rfid_reader.log")

    handlers = [RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3)]
    if config('LOG_TO_CONSOLE', cast=bool, default=False):
        handlers.append(logging.StreamHandler())

    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                        handlers=handlers)
    return logging.getLogger(__name__)


logger = configure_logging()


# Database Manager Class
class DatabaseManager:
    def __init__(self, dsn):
        self.dsn = dsn

    def insert_log(self, rfid_id, is_valid):
        try:
            with psycopg2.connect(self.dsn) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO \"RfidLog\" (\"rfidId\", \"isValid\", \"timestamp\") VALUES (%s, %s, %s)",
                        (rfid_id, is_valid, datetime.now())
                    )
                    logger.info(f"RFID ID: {rfid_id} logged as {'valid' if is_valid else 'invalid'}.")
        except psycopg2.Error as e:
            logger.error(f"Database error when inserting log entry: {e}")

    def check_validity(self, rfid_id, hasher):
        try:
            hash_rfid_id = hasher.hash(str(rfid_id))
            with psycopg2.connect(self.dsn) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT \"tag\" FROM \"ValidTag\" WHERE \"tag\" = %s", (hash_rfid_id,))
                    return cursor.fetchone() is not None
        except psycopg2.Error as e:
            logger.error(f"Database error when checking RFID validity: {e}")
            return False
        except exceptions.VerifyMismatchError as e:
            logger.error(f"Hash verification mismatch: {e}")
            return False


# RFID Reader Class
class RFIDReader:
    def __init__(self, db_manager, hasher):
        self.reader = SimpleMFRC522()
        self.db_manager = db_manager
        self.hasher = hasher
        self.last_invalid_scan_time = None

    def read_rfid(self):
        id, _ = self.reader.read_no_block()
        if id:
            logger.info(f"RFID ID: {id} read.")
            is_valid = self.db_manager.check_validity(id, self.hasher)
            self.db_manager.insert_log(id, is_valid)
            if is_valid:
                blink_led(config('GREEN_LED_PIN', cast=int, default=5), 3)
            else:
                blink_led(config('RED_LED_PIN', cast=int, default=3), 3)
            self.last_invalid_scan_time = None
            time.sleep(1)  # Delay between reads
        else:
            time.sleep(1)

    def cleanup(self):
        GPIO.cleanup()


def blink_led(pin, duration):
    end_time = time.time() + duration
    while time.time() < end_time:
        GPIO.output(pin, GPIO.HIGH)
        time.sleep(0.5)
        GPIO.output(pin, GPIO.LOW)
        time.sleep(0.5)


def setup_leds():
    GPIO.output(config('RED_LED_PIN', cast=int, default=3), GPIO.HIGH)  # Red LED on, indicating system is active
    GPIO.output(config('GREEN_LED_PIN', cast=int, default=5), GPIO.LOW)  # Ensure green LED is off


def signal_handler(sig, frame, reader):
    reader.cleanup()
    logger.info("Graceful shutdown initiated")
    sys.exit(0)


if __name__ == "__main__":
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(config('GREEN_LED_PIN', cast=int, default=5), GPIO.OUT)
    GPIO.setup(config('RED_LED_PIN', cast=int, default=3), GPIO.OUT)

    setup_leds()

    dsn = config('DATABASE_URL', default='REPLACE_WITH_YOUR_DSN')
    ph = PasswordHasher()
    db_manager = DatabaseManager(dsn)
    reader = RFIDReader(db_manager, ph)

    signal.signal(signal.SIGINT, lambda sig, frame: signal_handler(sig, frame, reader))
    signal.signal(signal.SIGTERM, lambda sig, frame: signal_handler(sig, frame, reader))

    try:
        while True:
            reader.read_rfid()
    except KeyboardInterrupt:
        pass
    finally:
        GPIO.cleanup()
