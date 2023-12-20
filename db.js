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
     * Inserts a new RFID tag into the database.
     * This method adds a new entry to the 'valid_tags' table with the provided tag UID.
     * 
     * @param {string} tagUid - The UID of the RFID tag to be inserted.
     * @returns {Promise<void>} A promise that resolves when the tag is successfully inserted or rejects with an error.
     * @example
     * // To insert a new RFID tag
     * const db = new Database();
     * db.insertRfidTag('1234567890')
     *   .then(() => console.log('Tag inserted successfully'))
     *   .catch(err => console.error('Error inserting tag:', err));
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
                if (err) {
                    console.error(`Error removing RFID tag: ${err.message}`);
                    reject(err);
                } else {
                    console.log(`RFID tag ${tagUid} removed successfully.`);
                    resolve();
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
