#!/bin/bash

# Determine the script's current directory
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

# Determine the base directory of the project
BASEDIR=$(dirname "$SCRIPT_DIR")

# Log directory and file setup
LOGDIR="$BASEDIR/logs/setup"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/setup-main_$(date +%Y%m%d_%H%M%S).log"

echo "Starting setup script" | tee -a $LOGFILE

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

# Function to read password with asterisk feedback
read_password() {
    prompt=$1
    echo -n "$prompt"
    stty -echo
    trap 'stty echo' EXIT

    password=""
    while IFS= read -p "$prompt" -r -s -n 1 char; do
        if [[ $char == $'\0' ]]; then
            break
        fi
        password+="$char"
        echo -n '*'
    done
    stty echo
    trap - EXIT
    echo
    echo "$password"
}

# Check and install required commands
install_command argon2 argon2 | tee -a $LOGFILE
install_command awk gawk | tee -a $LOGFILE

# Handling the .env file
ENV_FILE="$BASEDIR/.env"

# Check if .env file exists in the parent directory, if not, copy from sample in current directory
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$SCRIPT_DIR/.env.sample" ]; then
        cp "$SCRIPT_DIR/.env.sample" "$ENV_FILE"
        echo "Copied .env.sample from tools to .env in the parent directory" | tee -a $LOGFILE
    else
        echo "The .env.sample file does not exist in the tools directory" | tee -a $LOGFILE
        exit 1
    fi
fi
# Generate a more secure random string for SESSION_SECRET
RANDOM_STRING=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
echo 'Generated a secure RANDOM_STRING for SESSION_SECRET' | tee -a $LOGFILE

# Check if SESSION_SECRET already exists in .env
if grep -q "SESSION_SECRET=" "$ENV_FILE"; then
    # Replace the existing SESSION_SECRET
    sed -i "/SESSION_SECRET=/c\SESSION_SECRET=$RANDOM_STRING" "$ENV_FILE"
    echo "Replaced existing SESSION_SECRET in .env" | tee -a $LOGFILE
else
    # Ensure there's a newline at the end of .env
    tail -c1 "$ENV_FILE" | read -r _ || echo >> "$ENV_FILE"

    # Then append SESSION_SECRET
    echo "SESSION_SECRET=$RANDOM_STRING" >> "$ENV_FILE"
    echo "Appended SESSION_SECRET to .env" | tee -a $LOGFILE
fi

# Ask for the PostgreSQL password without displaying input
echo -n "Enter the PostgreSQL password: "
IFS= read -rs POSTGRES_PASSWORD
echo
echo "Setting PostgreSQL password" | tee -a $LOGFILE


# Update the .env file with the PostgreSQL password
if grep -q "POSTGRES_PASSWORD=" "$ENV_FILE"; then
    # Replace the existing POSTGRES_PASSWORD
    sed -i "/POSTGRES_PASSWORD=/c\POSTGRES_PASSWORD=$POSTGRES_PASSWORD" "$ENV_FILE"
    echo "Updated existing POSTGRES_PASSWORD in .env" | tee -a $LOGFILE
else
    # Ensure there's a newline at the end of .env
    tail -c1 "$ENV_FILE" | read -r _ || echo >> "$ENV_FILE"

    # Then append POSTGRES_PASSWORD
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> "$ENV_FILE"
    echo "Appended POSTGRES_PASSWORD to .env" | tee -a $LOGFILE

fi

# Update the DATABASE_URL with the new password
if grep -q "DATABASE_URL=" "$ENV_FILE"; then
    # Replace the password in DATABASE_URL
    sed -i "s/DATABASE_URL=\"postgresql:\/\/admin:.*@/DATABASE_URL=\"postgresql:\/\/admin:$POSTGRES_PASSWORD@/" "$ENV_FILE"
    echo "Updated DATABASE_URL in .env" | tee -a $LOGFILE
fi

# Navigate to the directory where docker-compose.yml is located
cd "$BASEDIR"

# Ask the user if they want to start the Docker containers
echo "Do you want to start the Database-Docker container now? (Recommended) (y/n)" | tee -a $LOGFILE
read -r start_containers

if [[ "$start_containers" =~ ^[Yy]$ ]]; then
    # Run Docker Compose to start the containers
    echo "Starting Docker container with Docker Compose..." | tee -a $LOGFILE
    docker-compose -p rpi-rfid -f docker/postgres-compose.yml up -d
    echo "Docker containers started." | tee -a $LOGFILE
else
    echo "Docker container not started. You can start them later by running:" | tee -a $LOGFILE
    echo "docker-compose -p rpi-rfid -f postgres-compose.yml up -d" | tee -a $LOGFILE
    echo "The compose file is located under the docker directory in the root folder" | tee -a $LOGFILE
fi



echo "Setup script completed" | tee -a $LOGFILE

exit