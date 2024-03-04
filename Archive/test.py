import RPi.GPIO as GPIO
import time

# Replace these with your specific GPIO pin numbers
GREEN_LED_PIN = 3  # Example GPIO pin where your green LED is connected
RED_LED_PIN = 2    # Example GPIO pin where your red LED is connected

# Initialize GPIO settings
GPIO.setmode(GPIO.BCM)
GPIO.setup(GREEN_LED_PIN, GPIO.OUT)
GPIO.setup(RED_LED_PIN, GPIO.OUT)

def blink_led(pin, blink_times=5, blink_duration=1):
    """Blinks an LED connected to the specified GPIO pin."""
    for _ in range(blink_times):
        GPIO.output(pin, GPIO.HIGH)
        time.sleep(blink_duration)
        GPIO.output(pin, GPIO.LOW)
        time.sleep(blink_duration)

if __name__ == "__main__":
    try:
        print("Starting LED blink test...")
        print(f"Blinking GREEN LED connected to GPIO {GREEN_LED_PIN}")
        blink_led(GREEN_LED_PIN)

        print(f"Blinking RED LED connected to GPIO {RED_LED_PIN}")
        blink_led(RED_LED_PIN)

        print("LED blink test completed.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        print("Cleaning up GPIO...")
        GPIO.cleanup()  # Reset the GPIO pins to a safe state
        