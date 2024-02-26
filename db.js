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
        logger.info('Database initialized with Prisma');
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
            const hashedTag = await argon2.hash(tagUid);
            const newTag = await prisma.validTag.create({
                data: { 
                    tag: hashedTag,
                    username: username // Add the username field
                }
            });
            return newTag;
        } catch (err) {
            logger.error(`Error inserting RFID tag: ${err.message}`);
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
            logger.error(`Error removing RFID tag: ${err.message}`);
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
            logger.error(`Error adding user: ${err.message}`);
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
            const count = await prisma.user.count();
            return count;
        } catch (err) {
            logger.error(`Error getting user count: ${err.message}`);
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
            const hashedTag = await argon2.hash(tagUid);
            const tags = await prisma.validTag.findMany();
            const tag = tags.find(t => argon2.verify(t.tag, hashedTag));
            return tag;
        } catch (err) {
            logger.error(`Error retrieving tag: ${err.message}`);
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
            const user = await prisma.user.findUnique({
                where: { username }
            });
            return user;
        } catch (err) {
            logger.error(`Error finding user by username: ${err.message}`);
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
            const user = await this.findUserByUsername(username);
            if (user && await argon2.verify(user.password, password)) {
                return true;
            }
            return false;
        } catch (err) {
            logger.error(`Error verifying user password: ${err.message}`);
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
            const user = await prisma.user.findUnique({
                where: { id }
            });
            return user;
        } catch (err) {
            logger.error(`Error finding user by ID: ${err.message}`);
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
            const user = await prisma.user.findUnique({
                where: { username }
            });

            if (!user) {
                throw new Error('User not found');
            }

            await prisma.user.delete({
                where: { id: user.id }
            });

            logger.info(`User ${username} removed successfully`);
        } catch (err) {
            logger.error(`Error removing user: ${err.message}`);
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
            logger.info("Querying database for users...");
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
    
            logger.info("Users retrieved:", formattedUsers);
            return formattedUsers;
        } catch (err) {
            logger.error("Error querying users from database:", err);
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
            logger.info("Querying database for RFID tags...");
            const tags = await prisma.validTag.findMany();
            logger.info("RFID tags retrieved:", tags);
            return tags;
        } catch (err) {
            logger.error("Error querying RFID tags from database:", err);
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
            logger.info("Querying database for RFID log entries...");
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

            logger.info("RFID log entries retrieved:", formattedLogEntries);
            return formattedLogEntries;
        } catch (err) {
            logger.error("Error querying RFID log entries from database:", err);
            throw err;
        }
    }

    async disconnect() {
        await prisma.$disconnect();
    }
    

}

module.exports = Database;
