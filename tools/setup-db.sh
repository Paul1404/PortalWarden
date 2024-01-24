#!/bin/bash

# Logging function
log() {
    level=$1
    shift
    msg="$@"
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $level: $msg" | tee -a "$LOGFILE"
}

# Log directory and file setup
LOGDIR="$BASEDIR/logs/setup"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/setup-db_$(date +%Y%m%d_%H%M%S).log"

log "INFO" "Running Prisma migrations to set up the database..."
cd ..  # Navigate to the directory containing your Prisma schema
prisma migrate deploy | tee -a $LOGFILE

log "INFO" "Database setup complete."

# Ask the user if they want to create a new user
log "INFO" "Asking user about creating a new user..."
read -p "Do you want to create a new user? (y/n) " answer
case $answer in
    [Yy]* ) 
        log "INFO" "Creating new user..."
        node ./tools/addUser.js | tee -a $LOGFILE
        ;;
    [Nn]* ) 
        log "INFO" "Skipping user creation."
        ;;
    * ) 
        log "WARNING" "Invalid input. Please answer yes (y) or no (n)."
        ;;
esac

# Ask the user if they want to enable SPI
log "INFO" "Asking user about enabling SPI on the Raspberry Pi..."
read -p "Do you want to enable SPI on the Raspberry Pi? (y/n) " spi_answer
case $spi_answer in
    [Yy]* ) 
        log "INFO" "Enabling SPI..."
        ./enable-spi.sh | tee -a $LOGFILE
        log "INFO" "SPI enabled."
        ;;
    [Nn]* ) 
        log "INFO" "Skipping SPI enable."
        ;;
    * ) 
        log "WARNING" "Invalid input. Please answer yes (y) or no (n)."
        ;;
esac

log "INFO" "Finished setup. Webserver can be run with: npm run web"
exit
