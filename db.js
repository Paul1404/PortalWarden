const sqlite3 = require('sqlite3').verbose();

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
            if (err) console.error(err.message);
            else console.log('Connected to the RFID tags database.');

            this.db.run(`CREATE TABLE IF NOT EXISTS valid_tags (
                id INTEGER PRIMARY KEY,
                tag TEXT NOT NULL UNIQUE,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error(err.message);
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
