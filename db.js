const sqlite3 = require('sqlite3').verbose();

class Database {
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

    getTag(tagUid) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT tag FROM valid_tags WHERE tag = ?', [tagUid], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

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
