#!/bin/bash

# Determine script and base directory paths
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(dirname "$SCRIPT_DIR")
PRISMA_DIR="$BASEDIR/prisma"

# Setup logging
LOGDIR="$BASEDIR/logs/setup"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/setup-main_$(date +%Y%m%d_%H%M%S).log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGFILE"
}

# Check for command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install command if missing
install_command() {
    if ! command_exists "$1"; then
        log "Installing $1..."
        sudo apt-get install -y "$1" >> "$LOGFILE" 2>&1
    else
        log "$1 is already installed."
    fi
}

# Generate SSL certificate
generate_ssl_certificate() {
    SSL_DIR="$BASEDIR/ssl"
    mkdir -p "$SSL_DIR"
    CERT_FILE="$SSL_DIR/cert.pem"
    KEY_FILE="$SSL_DIR/key.pem"

    if [[ ! -f "$CERT_FILE" ]] || [[ ! -f "$KEY_FILE" ]]; then
        log "Generating SSL certificate..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$KEY_FILE" -out "$CERT_FILE" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=example.com"
        log "SSL certificate generated."
    else
        log "SSL certificate already exists."
    fi
}

# Prepare .env for Prisma
prepare_prisma_env() {
    log "Preparing .env for Prisma..."
    PRISMA_ENV_FILE="$PRISMA_DIR/.env"
    mkdir -p "$PRISMA_DIR"
    touch "$PRISMA_ENV_FILE"

    echo "Enter DATABASE_URL for Prisma: "
    read -r DATABASE_URL
    echo "DATABASE_URL=$DATABASE_URL" > "$PRISMA_ENV_FILE"
    log "Prisma .env updated."
}

# Prepare .env for Node.js app
prepare_app_env() {
    log "Preparing .env for Node.js app..."
    APP_ENV_FILE="$BASEDIR/.env"
    touch "$APP_ENV_FILE"

    echo "Do you want to generate a new SESSION_SECRET? (y/N): "
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        SESSION_SECRET=$(openssl rand -hex 32)
        echo "SESSION_SECRET=$SESSION_SECRET" >> "$APP_ENV_FILE"
        log "Generated SESSION_SECRET."
    else
        log "Skipping SESSION_SECRET generation."
    fi
}

# Main setup sequence
log "Starting setup..."
install_command "openssl"
generate_ssl_certificate
prepare_prisma_env
prepare_app_env
log "Setup completed."
