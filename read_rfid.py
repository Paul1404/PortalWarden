import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
import time
import logging

logging.basicConfig(filename='rfid_reader.log', level=logging.INFO)
logger = logging.getLogger(__name__)

reader = SimpleMFRC522()

try:
    while True:
        logger.info("Ready to read RFID card")
        try:
            id, text = reader.read()
            logger.info(id)
            time.sleep(1)  # delay to prevent immediate subsequent reads
        except Exception as e:
            logger.error(f"An error occurred: {e}")
finally:
    GPIO.cleanup()