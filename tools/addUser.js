const Database = require('../db');
const readline = require('readline');
const readlineSync = require('readline-sync');


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
        console.log(`User ${username} added successfully.`);
    } catch (error) {
        console.error(`Error adding user: ${error.message}`);
    } finally {
        await db.close();
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
