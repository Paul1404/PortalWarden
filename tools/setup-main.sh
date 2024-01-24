#!/bin/bash

# Logging function
log() {
    level=$1
    shift
    msg="$@"
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $level: $msg" | tee -a "$LOGFILE"
}

# Determine the script's current directory and base directory
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(dirname "$SCRIPT_DIR")

# Log directory and file setup
LOGDIR="$BASEDIR/logs/setup"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/setup-main_$(date +%Y%m%d_%H%M%S).log"

log "INFO" "Starting setup script"

# Function to check if a command exists
command_exists() {
    type "$1" &> /dev/null ;
}

# Function to install a command if it does not exist
install_command() {
    command=$1
    package=$2

    if ! command_exists "$command"; then
        log "INFO" "Installing $command..."
        sudo apt-get install -y "$package" | tee -a $LOGFILE
    else
        log "INFO" "$command already installed."
    fi
}

# Function to read password with asterisk feedback
read_password() {
    prompt=$1
    echo -n "$prompt"
    stty -echo
    trap 'stty echo' EXIT

    password=""
    while IFS= read -r -s -n 1 char; do
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
install_command argon2 argon2
install_command awk gawk

# Handling the .env file
ENV_FILE="$BASEDIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$SCRIPT_DIR/.env.sample" ]; then
        cp "$SCRIPT_DIR/.env.sample" "$ENV_FILE"
        log "INFO" "Copied .env.sample from tools to .env in the parent directory"
    else
        log "ERROR" "The .env.sample file does not exist in the tools directory"
        exit 1
    fi
fi

# Generate a more secure random string for SESSION_SECRET
RANDOM_STRING=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
log "INFO" "Generated a secure RANDOM_STRING for SESSION_SECRET"

# Update SESSION_SECRET in .env
if grep -q "SESSION_SECRET=" "$ENV_FILE"; then
    sed -i "/SESSION_SECRET=/c\SESSION_SECRET=$RANDOM_STRING" "$ENV_FILE"
    log "INFO" "Replaced existing SESSION_SECRET in .env"
else
    tail -c1 "$ENV_FILE" | read -r _ || echo >> "$ENV_FILE"
    echo "SESSION_SECRET=$RANDOM_STRING" >> "$ENV_FILE"
    log "INFO" "Appended SESSION_SECRET to .env"
fi

# Ask for the PostgreSQL password
echo -n "Enter the PostgreSQL password: "
IFS= read -rs POSTGRES_PASSWORD
echo
log "INFO" "Setting PostgreSQL password"

# Update POSTGRES_PASSWORD in .env
if grep -q "POSTGRES_PASSWORD=" "$ENV_FILE"; then
    sed -i "/POSTGRES_PASSWORD=/c\POSTGRES_PASSWORD=$POSTGRES_PASSWORD" "$ENV_FILE"
    log "INFO" "Updated existing POSTGRES_PASSWORD in .env"
else
    tail -c1 "$ENV_FILE" | read -r _ || echo >> "$ENV_FILE"
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> "$ENV_FILE"
    log "INFO" "Appended POSTGRES_PASSWORD to .env"
fi

# Update DATABASE_URL in .env
if grep -q "DATABASE_URL=" "$ENV_FILE"; then
    sed -i "s/DATABASE_URL=\"postgresql:\/\/admin:.*@/DATABASE_URL=\"postgresql:\/\/admin:$POSTGRES_PASSWORD@/" "$ENV_FILE"
    log "INFO" "Updated DATABASE_URL in .env"
fi

# Docker Compose Actions
cd "$BASEDIR"
log "INFO" "Asking user to start Docker containers"
echo "Do you want to start the Database-Docker container now? (Recommended) (y/n)"
read -r start_containers

if [[ "$start_containers" =~ ^[Yy]$ ]]; then
    log "INFO" "Starting Docker container with Docker Compose"
    docker-compose -p rpi-rfid -f docker/postgres-compose.yml up -d
    log "INFO" "Docker containers started"
else
    log "INFO" "Docker container not started. Informed user about manual start."
    echo "You can start the container with this command below the compose file is located in the docker directory make sure to point to it when running this command."
    echo "docker-compose -p rpi-rfid -f postgres-compose.yml up -d"
fi

log "INFO" "Setup script completed"
exit
