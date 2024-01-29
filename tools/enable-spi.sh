#!/bin/bash

# Enable SPI Script for Raspberry Pi
# This script enables the SPI interface on a Raspberry Pi by modifying the /boot/config.txt file.
# It checks if the script is run as root, verifies the presence of the config file,
# and modifies it if SPI is not already enabled. It also creates a backup of the original config file.
# Finally, it offers to reboot the system to apply the changes.

# Path to the log file
LOG_FILE="/var/log/enable_spi.log"

# Path to the Raspberry Pi configuration file
CONFIG_FILE="/boot/config.txt"

# SPI configuration parameter
SPI_CONFIG="dtparam=spi=on"

# Function to log messages
# Arguments:
#   $1 - Message to log
function log {
    # Log with timestamp and append to the log file
    echo "$(date +"%Y-%m-%d %T"): $1" | tee -a $LOG_FILE
}

# Start of the script
log "Starting SPI enabling script."

# Check if the script is running as root
# Exit with an error if not running as root
if [ "$(id -u)" != "0" ]; then
   log "This script must be run as root. Exiting."
   exit 1
fi

# Check if /boot/config.txt is accessible
# Exit with an error if the file is not found
if [ ! -f $CONFIG_FILE ]; then
    log "Configuration file $CONFIG_FILE not found. Exiting."
    exit 1
fi

# Check if SPI is already enabled in the config file
# Exit successfully if SPI is already enabled
if grep -q "^$SPI_CONFIG" $CONFIG_FILE; then
    log "SPI is already enabled. No changes made."
    exit 0
else
    # Backup the existing config file
    cp $CONFIG_FILE "${CONFIG_FILE}.bak"
    log "Backup of config file created at ${CONFIG_FILE}.bak."

    # Append the SPI configuration to the config file
    # Directly check the command execution without using $?
    echo "$SPI_CONFIG" >> "$CONFIG_FILE"
    if echo "$SPI_CONFIG" >> "$CONFIG_FILE"; then
        log "SPI has been enabled in $CONFIG_FILE. A reboot is required."
    else
        log "Failed to enable SPI. Please check the log for errors."
        exit 1
    fi
fi

# Offer to reboot the system
# Accepts user input and reboots if the user agrees
read -rp "Would you like to reboot now? (y/n) " answer
case ${answer:0:1} in
    y|Y )
    log "Rebooting the system."
    reboot
    ;;
    * )
    log "Please reboot the system manually to apply changes."
    ;;
esac
