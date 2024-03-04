const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const createLogger = require('./logger');
const logger = createLogger(__filename);

require('dotenv').config();

const prisma = new PrismaClient();

/**
 * Represents the database handling for RFID and user management.
 * Utilizes Prisma as an ORM for database operations and Argon2 for hashing.
 */
class Database {
    /**
     * Constructs a new Database instance and sets the maximum users allowed.
     */
    constructor() {
        this.maxUsers = process.env.MAX_USERS || 5;
        logger.info(`Database operation: Initialized Database instance with Prisma ORM. Max users set to ${this.maxUsers}.`);
    }

    /**
     * Inserts an RFID tag into the database after hashing it.
     * 
     * @param {string} tagUid - The unique identifier of the RFID tag.
     * @param {string} username - The username associated with the RFID tag.
     * @returns {Promise<Object>} The newly created RFID tag record.
     * @throws {Error} If an error occurs during the database operation.
     */
    async insertRfidTag(tagUid, username) {
        try {
            logger.info(`Database operation: Attempting to insert a new RFID tag for user '${username}'.`)
            const hashedTag = await argon2.hash(tagUid);
            const newTag = await prisma.validTag.create({
                data: { 
                    tag: hashedTag,
                    username: username // Add the username field
                }
            });
            return newTag;
        } catch (err) {
            logger.error(`Database operation error: Failed to insert RFID tag for user '${username}'. Error: ${err.message}`);
            throw err;
        }
    }
    

    /**
     * Removes an RFID tag from the database.
     * 
     * @param {string} tagUid - The unique identifier of the RFID tag to be removed.
     * @throws {Error} If the tag is not found or a database error occurs.
     */
    async removeRfidTag(tagUid) {
        try {
            logger.info(`Database operation: Attempting to remove RFID tag with UID '${tagUid}'.`)
            const tags = await prisma.validTag.findMany();
            const tagToDelete = tags.find(async t => await argon2.verify(t.tag, tagUid));

            if (tagToDelete) {
                await prisma.validTag.delete({
                    where: { id: tagToDelete.id } // Assuming 'id' is the primary key of the tag record
                });
            } else {
                throw new Error('RFID tag not found');
            }
        } catch (err) {
            logger.error(`Database operation error: Failed to remove RFID tag with UID '${tagUid}'. Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Adds a new user to the database after hashing their password.
     * 
     * @param {string} username - The username for the new user.
     * @param {string} password - The password for the new user.
     * @returns {Promise<Object>} The newly created user record.
     * @throws {Error} If the username already exists or a database error occurs.
     */
    async addUser(username, password) {
        try {
            logger.info(`Database operation: Attempting to add a new user '${username}'.`)
            const existingUser = await prisma.user.findUnique({
                where: { username }
            });

            if (existingUser) {
                throw new Error('Username already exists');
            }

            const hashedPassword = await argon2.hash(password);
            const newUser = await prisma.user.create({
                data: { username, password: hashedPassword }
            });

            return newUser;
        } catch (err) {
            logger.error(`Database operation error: Failed to add user '${username}'. Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Counts the number of users in the database.
     * 
     * @returns {Promise<number>} The count of users in the database.
     * @throws {Error} If a database error occurs.
     */
    async getUserCount() {
        try {
            logger.info(`Database operation: Retrieving count of users in the database.`)
            const count = await prisma.user.count();
            return count;
        } catch (err) {
            logger.error(`Database operation error: Failed to retrieve user count. Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Retrieves an RFID tag from the database based on its UID.
     * 
     * @param {string} tagUid - The unique identifier of the RFID tag.
     * @returns {Promise<Object|null>} The RFID tag record if found, otherwise null.
     * @throws {Error} If a database error occurs.
     */
    async getTag(tagUid) {
        try {
            logger.info(`Database operation: Attempting to retrieve RFID tag with UID '${tagUid}'.`)
            const hashedTag = await argon2.hash(tagUid);
            const tags = await prisma.validTag.findMany();
            const tag = tags.find(t => argon2.verify(t.tag, hashedTag));
            return tag;
        } catch (err) {
            logger.error(`Database operation error: Failed to retrieve RFID tag with UID '${tagUid}'. Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Finds a user by their username.
     * 
     * @param {string} username - The username of the user to find.
     * @returns {Promise<Object|null>} The user record if found, otherwise null.
     * @throws {Error} If a database error occurs.
     */
    async findUserByUsername(username) {
        try {
            logger.info(`Database operation: Attempting to find user by username '${username}'.`)
            const user = await prisma.user.findUnique({
                where: { username }
            });
            return user;
        } catch (err) {
            logger.error(`Database operation error: Failed to find user '${username}'. Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Verifies if the provided password matches the stored hash for a given user.
     * 
     * @param {string} username - The username of the user.
     * @param {string} password - The password to verify.
     * @returns {Promise<boolean>} True if the password matches, otherwise false.
     * @throws {Error} If a database error occurs.
     */
    async verifyUserPassword(username, password) {
        try {
            logger.info(`Database operation: Verifying password for user '${username}'.`)
            const user = await this.findUserByUsername(username);
            if (user && await argon2.verify(user.password, password)) {
                return true;
            }
            return false;
        } catch (err) {
            logger.error(`Database operation error: Password verification failed for user '${username}'. Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Finds a user by their ID.
     * 
     * @param {number} id - The ID of the user to find.
     * @returns {Promise<Object|null>} The user record if found, otherwise null.
     * @throws {Error} If a database error occurs.
     */
    async findUserById(id) {
        try {
            logger.info(`Database operation: Attempting to find user by ID '${id}'.`)
            const user = await prisma.user.findUnique({
                where: { id }
            });
            return user;
        } catch (err) {
            logger.error(`Database operation error: Failed to find user with ID '${id}'. Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Removes a user from the database by their username.
     * 
     * @param {string} username - The username of the user to remove.
     * @throws {Error} If the user is not found or a database error occurs.
     */
    async removeUser(username) {
        try {
            logger.info(`Database operation: Attempting to remove user '${username}'.`)
            const user = await prisma.user.findUnique({
                where: { username }
            });

            if (!user) {
                throw new Error('User not found');
            }

            await prisma.user.delete({
                where: { id: user.id }
            });

            logger.info(`Database operation error: User ${username} removed successfully`);
        } catch (err) {
            logger.error(`Database operation error: Failed to remove user '${username}'. Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Retrieves all users from the database.
     * 
     * @returns {Promise<Array>} A list of user records.
     * @throws {Error} If a database error occurs.
     */
    async getUsers() {
        try {
            logger.info(`Database operation: Querying database for list of users.`);
            const users = await prisma.user.findMany({
                select: {
                    username: true,
                    createdAt: true,
                }
            });
    
            // Format 'createdAt' for each user
            const formattedUsers = users.map(user => {
                return {
                    ...user,
                    createdAt: this.formatDate(user.createdAt)
                };
            });

            return formattedUsers;
        } catch (err) {
            logger.error(`Database operation error: Failed to query users from database. Error: ${err.message}`, err);
            throw err;
        }
    }
    
    /**
     * Formats a date to a more human-readable string.
     * 
     * @param {Date} date - The date object to format.
     * @returns {string} A formatted date string.
     */
    formatDate(date) {
        return date.toLocaleString('en-GB', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
    
    
    /**
     * Retrieves all RFID tags from the database.
     * 
     * @returns {Promise<Array>} A list of RFID tag records.
     * @throws {Error} If a database error occurs.
     */
    async getRfidTags() {
        try {
            logger.info(`Database operation: Querying database for list of RFID tags.`);
            const tags = await prisma.validTag.findMany();
            return tags;
        } catch (err) {
            logger.error(`Database operation error: Failed to query RFID tags from database. Error: ${err.message}`, err);
            throw err;
        }
    }

    /**
     * Retrieves all RFID log entries from the database.
     * 
     * @returns {Promise<Array>} A list of RFID log entry records.
     * @throws {Error} If a database error occurs.
     */
    async getRfidLogEntries() {
        try {
            logger.info(`Database operation: Querying database for RFID log entries.`);
            const logEntries = await prisma.rfidLog.findMany({
                orderBy: {
                    timestamp: 'desc', // Assuming you might want to order by timestamp descending
                },
                select: {
                    id: true,
                    rfidId: true,
                    timestamp: true,
                }
            });

            // Format the timestamp for each log entry
            const formattedLogEntries = logEntries.map(entry => {
                return {
                    ...entry,
                    timestamp: this.formatDate(entry.timestamp),
                    rfidId: entry.rfidId.toString(), // Convert the BigInt to a string
                };
            });

            return formattedLogEntries;
        } catch (err) {
            logger.error(`Database operation error: Failed to query RFID log entries from database. Error: ${err.message}`, err);
            throw err;
        }
    }

    /**
 * Retrieves all log entries from the database.
 *
 * @returns {Promise<Array>} A list of log entry records.
 * @throws {Error} If a database error occurs.
 */
async getLogEntries() {
        try {
            logger.info(`Database operation: Querying database for log entries.`);
            const logEntries = await prisma.logEntry.findMany({
                orderBy: {
                    timestamp: 'desc',
                },
                select: {
                    id: true,
                    level: true,
                    message: true,
                    timestamp: true,
                }
            });

            // Format the timestamp for each log entry and rename it to 'date'
            const formattedLogEntries = logEntries.map(entry => {
                return {
                    id: entry.id,
                    level: entry.level,
                    message: entry.message,
                    date: this.formatDate(entry.timestamp) // Renaming 'timestamp' to 'date'
                };
            });

            return formattedLogEntries;
        } catch (err) {
            logger.error(`Database operation error: Failed to query log entries from database. Error: ${err.message}`, err);
            throw err;
        }
    }
    


    async disconnect() {
        await prisma.$disconnect();
    }
    

}

module.exports = Database;
