import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
import time
import logging
import psycopg2
from datetime import datetime
import traceback

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
            
    def read_rfid(self):
        """
        Continuously reads from the RFID reader, checks if the RFID tag is valid or invalid,
        and logs the RFID ID.
        """
        try:
            logger.info("Ready to read RFID card")
            id, _ = self.reader.read_no_block()  # Assuming read_no_block() is what you intend; if not, use read()
            if id:  # Proceed only if an RFID tag is detected
                if self.is_valid_tag(id):
                    self.insert_log(id)
                else:
                    logger.info(f"RFID ID: {id} is not a valid tag but will still be logged.")
                    self.insert_log(id)  # Log the invalid RFID ID as well
            else:
                logger.info("No RFID tag detected.")
            time.sleep(1)  # Sleep to prevent rapid repeated reads
        except Exception as e:
            logger.error(f"An error occurred while reading RFID: {e}")


    def is_valid_tag(self, rfid_id):
            """
            Checks if an RFID tag is valid by querying the ValidTag table in the database.
            Returns True if the tag is valid, False otherwise.
            """
            try:
                self.cursor.execute('SELECT EXISTS (SELECT 1 FROM "ValidTag" WHERE "tagId" = %s)', (rfid_id,))
                result = self.cursor.fetchone()
                if result and result[0]:
                    logger.info(f"RFID ID: {rfid_id} is a valid tag.")
                    return True
                else:
                    logger.info(f"RFID ID: {rfid_id} is not a valid tag.")
                    return False
            except Exception as e:
                logger.error(f"Database error when checking RFID validity: {e}")
                return False


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
