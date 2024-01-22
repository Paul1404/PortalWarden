#!/bin/bash

# Check if .env file exists, if not, copy from sample
if [ ! -f .env ]; then
    cp .env.sample .env
    echo "Copied .env.sample to .env"
fi

# Generate a unique SESSION_SECRET using Argon2
SECRET=$(argon2 "some_random_string" -id -t 3 -m 65536 -p 4 | awk '{print $NF}')
echo "Generated SESSION_SECRET"

# Append SESSION_SECRET to .env
echo "SESSION_SECRET=$SECRET" >> .env
echo "Appended SESSION_SECRET to .env"
