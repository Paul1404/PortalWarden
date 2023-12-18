# RFID Reader and Controller System

## Project Overview

This project consists of a Node.js application and a Python script working together to read RFID tags and perform actions based on the tag data. The Python script (`read_rfid.py`) reads RFID tags using an RC522 module and logs the data to an SQLite database. The Node.js application (`app.js`) is responsible for controlling hardware based on the RFID data and managing other system functionalities.

## Features

* RFID tag reading with logging to an SQLite database.
* Hardware control based on RFID tag data.
* Modular Node.js architecture for easy maintenance and scalability.

## Prerequisites

* Raspberry Pi with Raspbian OS.
* Node.js and npm installed.
* Python 3 installed.
* RC522 RFID Reader module.

## Installation

1. **Clone the Repository:**
    
    ```bash
    git clone [repository URL]
    cd [repository name]
    ```
    
2. **Install Node.js Dependencies:**
    
    ```bash
    npm install
    ```
    
3. **Set up Python Environment:** Make sure Python 3 is installed. Install required Python packages:
    
    ```bash
    pip3 install RPi.GPIO mfrc522
    ```
    

## Usage

* **Starting the Node.js Application:**
    
    ```bash
    node app.js
    ```
    
    This will start the Node.js server and the Python RFID reading script.
    
* **Reading RFID Tags:** The Python script will automatically read RFID tags and log them to the SQLite database.
    

## Hardware Setup

* Connect the RC522 module to the Raspberry Pi according to the standard connection diagram.
* Connect any additional hardware (like LEDs, servo motors, etc.) as required by `hardwareControl.js`.

## Configuration

* Edit `config.js` for hardware-specific configurations like GPIO pin assignments.

## Project Structure

* `app.js`: Main Node.js application.
* `db.js`: Database management for Node.js.
* `hardwareControl.js`: Controls hardware like LEDs, servo motors, etc.
* `config.js`: Configuration file for hardware settings.
* `read_rfid.py`: Python script for reading RFID tags.

## Logging

* Node.js logs are printed to the console.
* Python script logs are saved in `rfid_reader.log`.

## Contributing

Contributions to the project are welcome. Please follow the standard fork, branch, and pull request workflow.

## License

This project is licensed under MIT
