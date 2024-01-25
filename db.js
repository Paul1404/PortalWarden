const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
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
            const hashedTag = await argon2.hash(tagUid);
            const newTag = await prisma.validTag.create({
                data: { tag: hashedTag }
            });
            return newTag;
        } catch (err) {
            logger.error(`Error inserting RFID tag: ${err.message}`);
            throw err;
        }
    }

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
            const hashedTag = await argon2.hash(tagUid);
            const tags = await prisma.validTag.findMany();
            const tag = tags.find(t => argon2.verify(t.tag, hashedTag));
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
            if (user && await argon2.verify(user.password, password)) {
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

    async getUsers() {
        return await prisma.user.findMany();
    }

    async getRfidTags() {
        return await prisma.validTag.findMany();
    }

}

module.exports = Database;
