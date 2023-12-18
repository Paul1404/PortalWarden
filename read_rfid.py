# Description: This script reads the RFID card and writes the id and current timestamp to the SQLite database. File: read_rfid.py

import RPi.GPIO as GPIO  # type: ignore
from mfrc522 import SimpleMFRC522  # type: ignore
import time
import logging
import sqlite3
from datetime import datetime

logging.basicConfig(filename='rfid_reader.log', level=logging.INFO)
logger = logging.getLogger(__name__)

reader = SimpleMFRC522()

# Connect to the SQLite database
conn = sqlite3.connect('rfid_database.db')
c = conn.cursor()

# Create table if it doesn't exist
c.execute('''
    CREATE TABLE IF NOT EXISTS logins (
        id INTEGER PRIMARY KEY,
        timestamp TEXT
    )
''')

try:
    while True:
        logger.info("Ready to read RFID card")
        try:
            id, text = reader.read()
            logger.info(id)
            # Insert the id and current timestamp into the database
            c.execute("INSERT INTO logins VALUES (?, ?)", (id, datetime.now()))
            conn.commit()
            time.sleep(1)  # delay to prevent immediate subsequent reads
        except Exception as e:
            logger.error(f"An error occurred: {e}")
finally:
    # Close the database connection
    conn.close()
    GPIO.cleanup()