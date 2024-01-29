#!/bin/bash

# This script sets up the environment for a project.
# It performs several tasks including generating SSL certificates,
# preparing the .env file, and managing Docker containers.

# Logging function to record the setup process
log() {
    level=$1
    shift
    # shellcheck disable=SC2124
    msg="$@"
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $level: $msg" | tee -a "$LOGFILE"
}

# Determine script and base directory paths
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(dirname "$SCRIPT_DIR")

# Setup logging directory and file
LOGDIR="$BASEDIR/logs/setup"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/setup-main_$(date +%Y%m%d_%H%M%S).log"

log "INFO" "Starting setup script"

# Function to check if a command exists in the system
command_exists() {
    type "$1" &> /dev/null ;
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
install_command argon2 argon2
install_command awk gawk
install_command openssl openssl

# Handling the .env file
ENV_FILE="$BASEDIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$SCRIPT_DIR/.env.sample" ]; then
        cp "$SCRIPT_DIR/.env.sample" "$ENV_FILE"
        log "INFO" "Copied .env.sample to .env"
    else
        log "ERROR" ".env.sample file not found"
        exit 1
    fi
fi

# Generate SSL certificate
generate_ssl_certificate

# Generate a secure random string for SESSION_SECRET
RANDOM_STRING=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
log "INFO" "Generated secure RANDOM_STRING for SESSION_SECRET"

# Update SESSION_SECRET in .env
if grep -q "SESSION_SECRET=" "$ENV_FILE"; then
    sed -i "/SESSION_SECRET=/c\SESSION_SECRET=$RANDOM_STRING" "$ENV_FILE"
    log "INFO" "SESSION_SECRET updated in .env"
else
    echo -e "\nSESSION_SECRET=$RANDOM_STRING" >> "$ENV_FILE"
    log "INFO" "SESSION_SECRET added to .env"
fi

# Update POSTGRES_PASSWORD in .env
echo -n "Enter PostgreSQL password: "
IFS= read -rs POSTGRES_PASSWORD
echo
log "INFO" "Setting PostgreSQL password"

# Aktualisierung der POSTGRES_PASSWORD in der .env-Datei
if grep -q "POSTGRES_PASSWORD=" "$ENV_FILE"; then
    sed -i "/POSTGRES_PASSWORD=/c\POSTGRES_PASSWORD=$POSTGRES_PASSWORD" "$ENV_FILE"
    log "INFO" "POSTGRES_PASSWORD updated in .env"
else
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> "$ENV_FILE"
    log "INFO" "POSTGRES_PASSWORD added to .env"
fi

# Aktualisierung der DATABASE_URL in der .env-Datei
if grep -q "DATABASE_URL=" "$ENV_FILE"; then
    sed -i "s|DATABASE_URL=\"postgresql://admin:.*@|DATABASE_URL=\"postgresql://admin:$POSTGRES_PASSWORD@|" "$ENV_FILE"
    log "INFO" "DATABASE_URL updated in .env"
else
    echo "DATABASE_URL=\"postgresql://admin:$POSTGRES_PASSWORD@localhost/rpi-rfid-db\"" >> "$ENV_FILE"
    log "INFO" "DATABASE_URL added to .env"
fi


# Docker Compose Actions
cd "$BASEDIR" || exit 1
echo "Start Docker containers now? (y/n)"
read -r start_containers
if [[ "$start_containers" =~ ^[Yy]$ ]]; then
    docker-compose -p rpi-rfid-postgres -f postgres-compose.yml up -d
    log "INFO" "Docker containers started"
else
    log "INFO" "Docker containers not started"
    echo "Manual start command: docker-compose -p rpi-rfid-postgres -f postgres-compose.yml up -d"
fi


log "INFO" "Setup script completed"
