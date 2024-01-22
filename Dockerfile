# syntax=docker/dockerfile:1

ARG NODE_VERSION=18.18.2

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV production

WORKDIR /usr/src/app

# Install Python and build tools
RUN apk add --no-cache python3 py3-pip make g++

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies (production only)
RUN npm ci --only=production

# Run the application as a non-root user.
USER node

# Copy the rest of the source files into the image.
COPY . .

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD ["node", "webserver.js"]

