#!/bin/bash

# Enable SPI Script for Raspberry Pi

LOG_FILE="/var/log/enable_spi.log"
CONFIG_FILE="/boot/config.txt"
SPI_CONFIG="dtparam=spi=on"

function log {
    echo "$(date +"%Y-%m-%d %T"): $1" | tee -a $LOG_FILE
}

log "Starting SPI enabling script."

# Check if the script is running as root
if [ "$(id -u)" != "0" ]; then
   log "This script must be run as root. Exiting."
   exit 1
fi

# Check if /boot/config.txt is accessible
if [ ! -f $CONFIG_FILE ]; then
    log "Configuration file $CONFIG_FILE not found. Exiting."
    exit 1
fi

# Check if SPI is already enabled
if grep -q "^$SPI_CONFIG" $CONFIG_FILE; then
    log "SPI is already enabled. No changes made."
    exit 0
else
    # Backup the existing config file
    cp $CONFIG_FILE "${CONFIG_FILE}.bak"
    log "Backup of config file created at ${CONFIG_FILE}.bak."

    # Enable SPI
    echo $SPI_CONFIG >> $CONFIG_FILE
    if [ $? -eq 0 ]; then
        log "SPI has been enabled in $CONFIG_FILE. A reboot is required."
    else
        log "Failed to enable SPI. Please check the log for errors."
        exit 1
    fi
fi

# Offer to reboot
read -p "Would you like to reboot now? (y/n) " answer
case ${answer:0:1} in
    y|Y )
    log "Rebooting the system."
    reboot
    ;;
    * )
    log "Please reboot the system manually to apply changes."
    ;;
esac
