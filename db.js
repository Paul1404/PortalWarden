const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10; // Number of salt rounds for bcrypt

/**
 * Class representing a database for RFID tags.
 * Handles the database connection and operations.
 */
class Database {
    /**
     * Constructs the Database object and establishes a connection to the SQLite database.
     */
    constructor() {
        this.db = new sqlite3.Database('rfidTags.db', (err) => {
            if (err) {
                console.error(err.message);
            } else {
                console.log('Connected to the RFID tags database.');
            }

            // Create the valid_tags table
            this.db.run(`CREATE TABLE IF NOT EXISTS valid_tags (
                id INTEGER PRIMARY KEY,
                tag TEXT NOT NULL UNIQUE,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error(err.message);
            });

            // Create the users table
            this.db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`, (err) => {
                if (err) console.error(err.message);
            });
        });
    }

    /**
     * Inserts a new RFID tag into the database.
     * @param {string} tagUid - The UID of the RFID tag to be inserted.
     * @returns {Promise<void>} A promise that resolves when the tag is successfully inserted.
     */
    async insertRfidTag(tagUid) {
        return new Promise((resolve, reject) => {
            this.db.run("INSERT INTO valid_tags (tag) VALUES (?)", [tagUid], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Removes a tag from the database based on its UID.
     * @param {string} tagUid - The UID of the tag to be removed.
     * @returns {Promise<void>} A promise that resolves when the tag is successfully removed.
     */
    async removeRfidTag(tagUid) {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM valid_tags WHERE tag = ?", [tagUid], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Adds a new user with a hashed password to the database.
     * @param {string} username - The username of the user to be added.
     * @param {string} password - The password of the user to be added.
     * @returns {Promise<void>} A promise that resolves when the user is successfully added.
     */
    async addUser(username, password) {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Retrieves a tag from the database based on its UID.
     * @param {string} tagUid - The UID of the tag to be retrieved.
     * @returns {Promise<Object>} A promise that resolves with the tag data if found.
     */
    getTag(tagUid) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT tag FROM valid_tags WHERE tag = ?', [tagUid], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Finds a user by their username.
     * @param {string} username - The username to search for.
     * @returns {Promise<Object>} A promise that resolves with the user data if found.
     */
    findUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Verifies if the provided password matches the hashed password of the user.
     * @param {string} username - The username of the user.
     * @param {string} password - The password to be verified.
     * @returns {Promise<boolean>} A promise that resolves with true if the password matches, otherwise false.
     */
    async verifyUserPassword(username, password) {
        const user = await this.findUserByUsername(username);
        if (user) {
            return bcrypt.compare(password, user.password);
        }
        return false;
    }

    /**
     * Finds a user by their ID.
     * @param {number} id - The ID of the user to search for.
     * @returns {Promise<Object>} A promise that resolves with the user data if found.
     */
    findUserById(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    console.error(`Error finding user by ID: ${err.message}`);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }


    /**
     * Closes the database connection.
     * @returns {Promise<void>} A promise that resolves when the connection is successfully closed.
     */
    close() {
        return new Promise((resolve, reject) => {
            this.db.close(err => {
                if (err) reject(err);
                else {
                    console.log('Closed the database connection.');
                    resolve();
                }
            });
        });
    }
}

module.exports = Database;
