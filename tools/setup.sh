#!/bin/bash

# Determine the base directory of the script
BASEDIR=$(dirname "$0")/..
LOGDIR="$BASEDIR/logs/setup"

# Create the log directory if it doesn't exist
mkdir -p "$LOGDIR"

# Define the log file
LOGFILE="$LOGDIR/setup_$(date +%Y%m%d_%H%M%S).log"

echo "Starting setup script" | tee -a $LOGFILE

#!/bin/bash

# Determine the base directory of the script
BASEDIR=$(dirname "$0")/..
LOGDIR="$BASEDIR/logs/setup"

# Create the log directory if it doesn't exist
mkdir -p "$LOGDIR"

# Define the log file
LOGFILE="$LOGDIR/setup_$(date +%Y%m%d_%H%M%S).log"

# Function to check if a command exists
command_exists() {
    type "$1" &> /dev/null ;
}

# Function to install a command if it does not exist
install_command() {
    command=$1
    package=$2

    if ! command_exists "$command"; then
        echo "Installing $command..." | tee -a $LOGFILE
        sudo apt-get install -y "$package" | tee -a $LOGFILE
    fi
}

# Check and install required commands
install_command argon2 argon2 | tee -a $LOGFILE
install_command awk gawk | tee -a $LOGFILE

# Check if .env file exists, if not, copy from sample
if [ ! -f .env ]; then
    cp .env.sample .env
    echo "Copied .env.sample to .env" | tee -a $LOGFILE
fi

# Generate a more secure random string
RANDOM_STRING=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
echo 'Generated a secure RANDOM_STRING' | tee -a $LOGFILE

# Check if SESSION_SECRET already exists in .env
if grep -q "SESSION_SECRET=" .env; then
    # Replace the existing SESSION_SECRET
    sed -i "/SESSION_SECRET=/c\SESSION_SECRET=$RANDOM_STRING" .env
    echo "Replaced existing SESSION_SECRET in .env" | tee -a $LOGFILE
else
    # Append SESSION_SECRET to .env with a newline, ensuring newline is correctly added
    echo "" >> .env  # Add an empty line for safety
    echo "SESSION_SECRET=$RANDOM_STRING" >> .env
    echo "Appended SESSION_SECRET to .env" | tee -a $LOGFILE
fi # Closing the if-else block

# Move the .env file to the parent directory
mv .env ../.env
echo "Copied .env to the parent directory" | tee -a $LOGFILE

# Run Prisma migrations to set up the database
echo "Running Prisma migrations to set up the database..." | tee -a $LOGFILE
cd ..  # Navigate to the directory containing your Prisma schema
prisma migrate deploy | tee -a $LOGFILE

echo "Database setup complete." | tee -a $LOGFILE

# Ask the user if they want to create a new user
read -p "Do you want to create a new user? (y/n) " answer
case $answer in
    [Yy]* ) 
        echo "Creating new user..." | tee -a $LOGFILE
        node ./tools/addUser.js | tee -a $LOGFILE
        ;;
    [Nn]* ) 
        echo "Skipping user creation." | tee -a $LOGFILE
        ;;
    * ) 
        echo "Please answer yes or no." | tee -a $LOGFILE
        ;;
esac

# Ask the user if they want to enable SPI
read -p "Do you want to enable SPI on the Raspberry Pi? (y/n) " spi_answer
case $spi_answer in
    [Yy]* ) 
        echo "Enabling SPI..." | tee -a $LOGFILE
        ./enable-spi.sh | tee -a $LOGFILE
        echo "SPI enabled." | tee -a $LOGFILE
        ;;
    [Nn]* ) 
        echo "Skipping SPI enable." | tee -a $LOGFILE
        ;;
    * ) 
        echo "Please answer yes (y) or no (n)." | tee -a $LOGFILE
        ;;
esac

echo "Finished! You can run the webserver with: npm run web" | tee -a $LOGFILE

exit

