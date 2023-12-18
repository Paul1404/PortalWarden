import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
import time
import logging
import sqlite3
from datetime import datetime

def configure_logging():
    """
    Configures the logging for the application.
    Logs are written to 'rfid_reader.log'.
    """
    logging.basicConfig(filename='rfid_reader.log', level=logging.INFO)
    return logging.getLogger(__name__)

logger = configure_logging()

class RFIDReader:
    """
    A class to handle RFID reading and logging RFID data to a SQLite database.
    """

    def __init__(self):
        """
        Initializes the RFID reader and establishes a database connection.
        """
        self.reader = SimpleMFRC522()
        self.conn = sqlite3.connect('rfid_database.db')
        self.cursor = self.conn.cursor()
        self.setup_database()

    def setup_database(self):
        """
        Sets up the database table for storing RFID logins.
        """
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS logins (
                id INTEGER PRIMARY KEY,
                timestamp TEXT
            )
        ''')

    def read_rfid(self):
        """
        Continuously reads from the RFID reader and logs the data.
        """
        try:
            while True:
                logger.info("Ready to read RFID card")
                try:
                    id, text = self.reader.read()
                    logger.info(f"RFID ID: {id}")

                    # Insert the ID and current timestamp into the database
                    self.cursor.execute("INSERT INTO logins VALUES (?, ?)", (id, datetime.now()))
                    self.conn.commit()

                    # Sleep for 1 second to prevent immediate subsequent reads
                    time.sleep(1)
                except Exception as e:
                    logger.error(f"An error occurred: {e}")
        finally:
            self.close()

    def close(self):
        """
        Closes the database connection and cleans up GPIO.
        """
        self.conn.close()
        GPIO.cleanup()

if __name__ == "__main__":
    reader = RFIDReader()
    reader.read_rfid()
