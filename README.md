# RPI-RFID-Door-Control Setup Guide 🚪🔑

Welcome to the RPI-RFID-Door-Control repository! This guide will walk you through the steps needed to get the service up and running on your machine. 🚀

## Prerequisites 📋

Before you begin, ensure you have the following installed:
- Node.js and npm (Node Package Manager) 📦
- Docker and Docker Compose 🐳

## Installation and Setup 🛠️

Follow these steps to set up the project:

### 1. Clone the Repository 📂

First, clone the repository to your local machine:

```bash
git clone https://github.com/Paul1404/RPI-RFID-Door-Control.git
cd RPI-RFID-Door-Control
```

### 2. Install Node.js Dependencies 📌

Run the following command to install the necessary Node.js dependencies:

```bash
npm install
```

### 3. Install and Configure Docker 🐳

Ensure Docker and Docker Compose are installed on your system. For detailed instructions, refer to the official Docker documentation.

### 4. Run Setup Scripts 🧰

Navigate to the `tools` directory and run the main setup script:

```bash
cd tools
bash setup-main.sh
```

Follow the prompts to complete the setup. The script will handle the configuration of environment variables and other necessary setup tasks.

Next, run the database setup script:

```bash
bash setup-db.sh
```

This script sets up the database using Prisma migrations and allows you to create a new user and configure additional settings.

### 5. Start the Service 🌐

After completing the setup, start the service by running:

```bash
npm run web
```

## Accessing the Service 🖥️

Once the service is running, it will be accessible via:

```arduino
http://<your-ip-address>:3000
```

Replace `<your-ip-address>` with the IP address of the machine where the service is installed.

## Further Assistance 🆘

If you encounter any issues or have questions, please refer to the detailed documentation or open an issue in the GitHub repository.

Thank you for using RPI-RFID-Door-Control! 🎉
