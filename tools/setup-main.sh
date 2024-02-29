#!/bin/bash

# This script sets up the environment for a project.
# It performs several tasks including generating SSL certificates
# and preparing the .env file in the prisma folder.

# Logging function to record the setup process
log() {
    level="$1"
    shift
    # shellcheck disable=SC2124
    msg="$@"
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $level: $msg" | tee -a "$LOGFILE"
}

# Determine script and base directory paths
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(dirname "$SCRIPT_DIR")
PRISMA_DIR="$BASEDIR/prisma" # Corrected the path to directly point to the prisma directory

# Setup logging directory and file
LOGDIR="$BASEDIR/logs/setup"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/setup-main_$(date +%Y%m%d_%H%M%S).log"

log "INFO" "Starting setup script"

# Function to check if a command exists in the system
command_exists() {
    type "$1" &> /dev/null
}

# Function to install a command if not already present
install_command() {
    command=$1
    package=$2

    if ! command_exists "$command"; then
        log "INFO" "Installing $command..."
        sudo apt-get install -y "$package" | tee -a "$LOGFILE"
    else
        log "INFO" "$command already installed."
    fi
}

# Function to generate a self-signed SSL certificate
generate_ssl_certificate() {
    SSL_DIR="$BASEDIR/ssl"
    CERT_FILE="$SSL_DIR/cert.pem"
    KEY_FILE="$SSL_DIR/key.pem"

    mkdir -p "$SSL_DIR"

    if [[ ! -f "$CERT_FILE" ]] || [[ ! -f "$KEY_FILE" ]]; then
        log "INFO" "Generating self-signed SSL certificate..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$KEY_FILE" -out "$CERT_FILE" \
            -subj "/C=DE/ST=Bavaria/L=Untereuerheim/O=Localhost/CN=localhost"
        log "INFO" "SSL certificate generated at $SSL_DIR"
    else
        log "INFO" "SSL certificate already exists."
    fi
}

# Check for and install required commands
install_command openssl openssl

# Generate SSL certificate
generate_ssl_certificate

# Handling the .env file in the prisma folder
mkdir -p "$PRISMA_DIR" # Ensure the directory exists
ENV_FILE="$PRISMA_DIR/.env"

# Verify current working directory
log "INFO" "Current working directory: $(pwd)"
log "INFO" "Prisma directory path: $PRISMA_DIR"

if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
    log "INFO" "Created .env in the prisma folder"
fi

# Ask for DATABASE_URL and DIRECT_URL
echo -n "Enter DATABASE_URL (from Neon dashboard): "
read -rs DATABASE_URL
echo # New line for neatness
log "INFO" "Setting DATABASE_URL"

echo -n "Enter DIRECT_URL (from Neon dashboard): "
read -rs DIRECT_URL
echo # New line for neatness
log "INFO" "Setting DIRECT_URL"

# Update .env in the prisma folder
{
    echo "DATABASE_URL=$DATABASE_URL"
    echo "DIRECT_URL=$DIRECT_URL"
} > "$ENV_FILE" # Using '>' to overwrite/create fresh .env content
log "INFO" ".env updated with DATABASE_URL and DIRECT_URL in the prisma folder"

log "INFO" "Setup script completed"
