const Database = require('../db');
const readline = require('readline');
const readlineSync = require('readline-sync');

const createLogger = require('../logger');
const logger = createLogger(__filename);


// Create an interface for command line input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to add a user
async function addUser(username, password) {
    const db = new Database();

    try {
        await db.addUser(username, password);
        logger.info(`User ${username} added successfully.`);
    } catch (error) {
        logger.error(`Error adding user: ${error.message}`);
    } finally {
        logger.info('Finished!')
    }
}

rl.question('Username: ', (username) => {
    // Ask for password and mask input
    const password = readlineSync.question('Password: ', {
        hideEchoBack: true // The typed text on screen is hidden.
    });

    addUser(username, password).then(() => {
        rl.close();
    });
});
