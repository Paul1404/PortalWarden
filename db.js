const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const createLogger = require('./logger');
const logger = createLogger(__filename);

const prisma = new PrismaClient();

class Database {
    constructor() {
        this.maxUsers = process.env.MAX_USERS || 5;
        logger.info('Database initialized with Prisma');
    }

    async insertRfidTag(tagUid) {
        try {
            const newTag = await prisma.validTag.create({
                data: { tag: tagUid }
            });
            return newTag;
        } catch (err) {
            logger.error(`Error inserting RFID tag: ${err.message}`);
            throw err;
        }
    }

    async removeRfidTag(tagUid) {
        try {
            await prisma.validTag.delete({
                where: { tag: tagUid }
            });
        } catch (err) {
            logger.error(`Error removing RFID tag: ${err.message}`);
            throw err;
        }
    }

    async addUser(username, password) {
        try {
            const userCount = await this.getUserCount();
            if (userCount >= this.maxUsers) {
                throw new Error('Maximum number of users reached');
            }
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const newUser = await prisma.user.create({
                data: { username, password: hashedPassword }
            });
            return newUser;
        } catch (err) {
            logger.error(`Error adding user: ${err.message}`);
            throw err;
        }
    }

    async getUserCount() {
        try {
            const count = await prisma.user.count();
            return count;
        } catch (err) {
            logger.error(`Error getting user count: ${err.message}`);
            throw err;
        }
    }

    async getTag(tagUid) {
        try {
            const tag = await prisma.validTag.findUnique({
                where: { tag: tagUid }
            });
            return tag;
        } catch (err) {
            logger.error(`Error retrieving tag: ${err.message}`);
            throw err;
        }
    }

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

    async verifyUserPassword(username, password) {
        try {
            const user = await this.findUserByUsername(username);
            if (user && await bcrypt.compare(password, user.password)) {
                return true;
            }
            return false;
        } catch (err) {
            logger.error(`Error verifying user password: ${err.message}`);
            throw err;
        }
    }

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
}

module.exports = Database;
