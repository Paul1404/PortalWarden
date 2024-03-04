const express = require('express');
const passport = require('passport');
const path = require('path');


module.exports = function({ db, logger, ensureAuthenticated }) {
    const router = express.Router();
    
    router.get('/', ensureAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, 'private', 'index.html'));
    });

    router.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

    router.post('/login', (req, res, next) => {
        passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/login',
            failureFlash: false
        })(req, res, next);
    });

    router.get('/logout', (req, res, next) => {
        const username = req.user ? req.user.username : 'Unknown';
        logger.info(`User logged out: ${username}`);

        req.logout(function (err) {
            if (err) {
                logger.error('Error during logout:', err);
                return next(err);
            }
            res.redirect('/login');
        });
    });

    router.post('/add-rfid', ensureAuthenticated, async (req, res) => {
        const tagUid = req.body.tagUid;
        const targetUsername = req.body.username;

        try {
            await db.insertRfidTag(tagUid, targetUsername);
            logger.info(`RFID tag added successfully for user ${targetUsername}`);
            res.status(200).send(`RFID tag added successfully.`);
        } catch (error) {
            logger.error(`Error adding RFID tag: ${error.message}`);
            res.status(500).send(`Error adding RFID tag: ${error.message}`);
        }
    });

    router.get('/users', ensureAuthenticated, async (req, res) => {
        try {
            const users = await db.getUsers();
            logger.info("Users fetched", users);
            res.json(users);
        } catch (err) {
            logger.error("Error retrieving users:", err);
            res.status(500).json({error: `Error retrieving users: ${err.message}`});
        }
    });

    router.get('/rfid-tags', ensureAuthenticated, async (req, res) => {
        try {
            const tags = await db.getRfidTags();
            logger.info("RFID tags fetched", tags);
            res.json(tags);
        } catch (err) {
            logger.error("Error retrieving RFID tags:", err);
            res.status(500).json({error: `Error retrieving RFID tags: ${err.message}`});
        }
    });

    router.delete('/remove-rfid/:tagUid', ensureAuthenticated, async (req, res) => {
        const tagUid = req.params.tagUid;
        logger.info(`Initiating removal of an RFID tag.`);

        try {
            await db.removeRfidTag(tagUid);
            logger.info(`RFID tag removed successfully`);
            res.status(200).send(`RFID tag removed successfully.`);
        } catch (error) {
            logger.error(`Error removing RFID tag: ${error.message}`);
            res.status(500).send(`Error removing RFID tag: ${error.message}`);
        }
    });

    router.post('/add-user', ensureAuthenticated, async (req, res) => {
        const {username, password} = req.body;
        logger.info(`Received request to add user: ${username}`);

        try {
            await db.addUser(username, password);
            logger.info(`User ${username} added successfully.`);
            res.status(200).send(`User ${username} added successfully.`);
        } catch (error) {
            logger.error(`Error adding user ${username}: ${error.message}`);
            res.status(500).send(`Error adding user: ${error.message}`);
        }
    });

    router.delete('/remove-user/:username', ensureAuthenticated, async (req, res) => {
        const {username} = req.params;
        logger.info(`Received request to remove user: ${username}`);

        try {
            await db.removeUser(username);
            logger.info(`User ${username} removed successfully.`);
            res.status(200).send(`User ${username} removed successfully.`);
        } catch (error) {
            logger.error(`Error removing user ${username}: ${error.message}`);
            res.status(500).send(`Error removing user: ${error.message}`);
        }
    });

    router.get('/log-explorer', ensureAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, 'private', 'log-explorer.html'));
    });

    router.get('/api/logs', ensureAuthenticated, async (req, res) => {
        try {
            const data = await db.getLogEntries();
            res.json({ data });
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            res.status(500).send('Failed to fetch logs');
        }
    });


    router.get('/rfid-logs', ensureAuthenticated, async (req, res) => {
        try {
            const logEntries = await db.getRfidLogEntries();
            res.json(logEntries);
        } catch (err) {
            logger.error("Error retrieving RFID log entries:", err);
            res.status(500).json({error: `Error retrieving RFID log entries: ${err.message}`});
        }
    });
    
    return router;
};