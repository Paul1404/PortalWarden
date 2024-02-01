import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
import time
import logging
import psycopg2
from datetime import datetime
import traceback
from argon2 import PasswordHasher

# Initialize Argon2 PasswordHasher
ph = PasswordHasher()

def configure_logging():
    """
    Configures the logging for the application.
    Logs are written to 'rfid_reader.log'.
    """
    logging.basicConfig(filename='rfid_reader.log', level=logging.INFO, format='%(asctime)s:%(levelname)s:%(message)s')
    return logging.getLogger(__name__)

logger = configure_logging()

class RFIDReader:
    """
    A class to handle RFID reading and logging RFID data to a PostgreSQL database.
    """

    def __init__(self):
        """
        Initializes the RFID reader and establishes a database connection.
        """
        self.reader = SimpleMFRC522()
        try:
            self.conn = psycopg2.connect(host='localhost', dbname='access-control', user='admin', password='raspberrypi12')
            self.cursor = self.conn.cursor()
            logger.info('Database connection established')
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise e

    def insert_log(self, rfid_id):
        """
        Inserts a log entry into the database for an RFID read event.
        """
        try:
            self.cursor.execute(
            'INSERT INTO "RfidLog" ("rfidId", "timestamp") VALUES (%s, %s)',
            (rfid_id, datetime.now())
            )
            self.conn.commit()
            logger.info(f"Log entry for RFID ID: {rfid_id} inserted.")
        except Exception as e:
            logger.error(f"Database error when inserting log entry: {e}")
            self.conn.rollback()
            
            
    def check_validity(self, rfid_id):
        """
        Checks if an RFID ID is valid by comparing it to hashed values in the database.
        """
        try:
            # Retrieve the hashed RFID ID from the database
            self.cursor.execute(
                'SELECT "tag" FROM "ValidTag"'
            )
            retrieved_hashes = self.cursor.fetchall()

            # Log the received RFID ID for debugging purposes
            logger.info(f"Received RFID ID: {rfid_id}")

            # Iterate through retrieved hashes and check if any match
            for retrieved_hash in retrieved_hashes:
                database_hash = retrieved_hash[0]
                logger.info(f"Database Hash: {database_hash}")

                if ph.verify(database_hash, str(rfid_id)):
                    logger.info(f"RFID ID {rfid_id} is valid.")
                    return True

            # If no matching hash found
            logger.info(f"RFID ID {rfid_id} is not valid.")
            return False

        except Exception as e:
            logger.error(f"Database error when checking RFID validity: {e}")
            return False

        
            
    def read_rfid(self):
            try:
                logger.info("Ready to read RFID card")
                id, _ = self.reader.read_no_block()
                if id:
                    logger.info(f"RFID ID: {id}")

                    # Check if the RFID ID is valid
                    is_valid = self.check_validity(id)

                    if is_valid:
                        logger.info("RFID ID is valid and will be logged.")
                        self.insert_log(id)
                    else:
                        logger.info("RFID ID is not valid but will still be logged.")

                    time.sleep(1)
                else:
                    logger.info("No RFID tag detected.")
                time.sleep(1)
            except Exception as e:
                logger.error(f"An error occurred while reading RFID: {e}")


    def close(self):
        """
        Closes the database connection and cleans up GPIO.
        """
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
        GPIO.cleanup()

if __name__ == "__main__":
    reader = RFIDReader()
    try:
        while True:
            reader.read_rfid()
    except KeyboardInterrupt:
        logger.info("RFID reading interrupted")
    finally:
        reader.close()
