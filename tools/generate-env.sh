#!/bin/bash

# Function to check if a command exists
command_exists() {
    type "$1" &> /dev/null ;
}

# Function to install a command if it does not exist
install_command() {
    command=$1
    package=$2

    if ! command_exists "$command"; then
        echo "Installing $command..."
        sudo apt-get install -y "$package"
    fi
}

# Check if running as root, if not exit
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root or use sudo"
    exit 1
fi

# Check and install required commands
install_command argon2 argon2
install_command awk gawk

# Check if .env file exists, if not, copy from sample
if [ ! -f .env ]; then
    cp .env.sample .env
    echo "Copied .env.sample to .env"
fi

# Generate a more secure random string
RANDOM_STRING=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
echo 'Generated a secure RANDOM_STRING'

# Check if SESSION_SECRET already exists in .env
if grep -q "SESSION_SECRET=" .env; then
    # Replace the existing SESSION_SECRET
    sed -i "/SESSION_SECRET=/c\SESSION_SECRET=$RANDOM_STRING" .env
    echo "Replaced existing SESSION_SECRET in .env"
else
    # Append SESSION_SECRET to .env with a newline, ensuring newline is correctly added
    echo "" >> .env  # Add an empty line for safety
    echo "SESSION_SECRET=$RANDOM_STRING" >> .env
    echo "Appended SESSION_SECRET to .env"
fi # Closing the if-else block


# Move the .env file to the parent directory
mv .env ../.env
echo "Copied .env to the parent directory"

# Ask the user if they want to create a new user
read -p "Do you want to create a new user? (y/n) " answer

case $answer in
    [Yy]* ) 
        echo "Creating new user..."
        node addUser.js
        ;;
    [Nn]* ) 
        echo "Skipping user creation."
        ;;
    * ) 
        echo "Please answer yes or no."
        ;;
esac
