import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522

reader = SimpleMFRC522()

try:
    while True:
        print("Ready to read RFID card")
        id, text = reader.read()
        print(id)  # This will be captured by the Node.js application
finally:
    GPIO.cleanup()

