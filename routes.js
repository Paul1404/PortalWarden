const express = require('express');
const passport = require('passport');
const path = require('path');


module.exports = function({ db, logger, ensureAuthenticated }) {
    const router = express.Router();
    
    router.get('/', ensureAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, 'private', 'index.html'));
        logger.info(`Private index page served successfully to authenticated user '${req.user.username}' from IP '${req.ip}'.`);
    });

    router.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
        logger.info(`Login page served to client IP '${req.ip}'.`);
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
        logger.info(`Logout action initiated for user '${username}'. Proceeding with user session termination.`);

        req.logout(function (err) {
            if (err) {
                logger.error(`Logout process encountered an error for user '${username}'. Error details:`, err);
                return next(err);
            }
            res.redirect('/login');
            logger.info(`Logout success: User '${username}' successfully logged out and redirected to login page.`);
        });
    });

    router.post('/add-rfid', ensureAuthenticated, async (req, res) => {
        const tagUid = req.body.tagUid;
        const targetUsername = req.body.username;

        try {
            await db.insertRfidTag(tagUid, targetUsername);
            logger.info(`RFID tag added successfully for user ${targetUsername}`);
            res.status(200).send(`RFID tag addition: Successfully assigned new RFID tag to user '${targetUsername}'.`);
        } catch (error) {
            logger.error(`Error adding RFID tag: ${error.message}`);
            res.status(500).send(`RFID tag addition failure: Encountered an error while assigning RFID tag to user '${targetUsername}'. Error details: ${error.message}.`);
        }
    });

    router.get('/users', ensureAuthenticated, async (req, res) => {
        try {
            const users = await db.getUsers();
            logger.info(`User data retrieval: Successfully fetched user list for dashboard display.`);
            res.json(users);
        } catch (err) {
            logger.error(`User data retrieval failure: Encountered an error while fetching user list for dashboard. Error details:`, err);
            res.status(500).json({error: `Error retrieving users: ${err.message}`});
        }
    });

    router.get('/rfid-tags', ensureAuthenticated, async (req, res) => {
        try {
            const tags = await db.getRfidTags();
            logger.info(`RFID tag data retrieval: Successfully fetched RFID tags for dashboard display.`);
            res.json(tags);
        } catch (err) {
            logger.error(`RFID tag data retrieval failure: Encountered an error while fetching RFID tags for dashboard. Error details:`, err);
            res.status(500).json({error: `Error retrieving RFID tags: ${err.message}`});
        }
    });

    router.delete('/remove-rfid/:tagUid', ensureAuthenticated, async (req, res) => {
        const tagUid = req.params.tagUid;
        logger.info(`RFID tag removal initiated: Starting process to remove RFID tag with UID '${tagUid}'.`);

        try {
            await db.removeRfidTag(tagUid);
            logger.info(`RFID tag removal success: RFID tag with UID '${tagUid}' successfully removed from the system.`);
            res.status(200).send(`RFID tag removed successfully.`);
        } catch (error) {
            logger.error(`RFID tag removal failure: Encountered an error while removing RFID tag with UID '${tagUid}'. Error details: ${error.message}.`);
            res.status(500).send(`Error removing RFID tag: ${error.message}`);
        }
    });

    router.post('/add-user', ensureAuthenticated, async (req, res) => {
        const {username, password} = req.body;
        logger.info(`User addition request received: Starting process to add new user '${username}'.`);

        try {
            await db.addUser(username, password);
            logger.info(`User addition success: New user '${username}' successfully added to the system.`);
            res.status(200).send(`User ${username} added successfully.`);
        } catch (error) {
            logger.error(`User addition failure: Encountered an error while adding new user '${username}'. Error details: ${error.message}.`);
            res.status(500).send(`Error adding user: ${error.message}`);
        }
    });

    router.delete('/remove-user/:username', ensureAuthenticated, async (req, res) => {
        const {username} = req.params;
        logger.info(`User removal request received: Initiating process to remove user '${username}' from the system.`);

        try {
            await db.removeUser(username);
            logger.info(`User removal success: User '${username}' successfully removed from the system.`);
            res.status(200).send(`User ${username} removed successfully.`);
        } catch (error) {
            logger.error(`User removal failure: Encountered an error while removing user '${username}'. Error details: ${error.message}.`);
            res.status(500).send(`Error removing user: ${error.message}`);
        }
    });

    router.get('/log-explorer', ensureAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, 'private', 'log-explorer.html'));
        logger.info(`Log explorer page served successfully to authenticated user '${req.user.username}' from IP '${req.ip}'.`);
    });

    router.get('/api/logs', ensureAuthenticated, async (req, res) => {
        try {
            const data = await db.getLogEntries();
            res.json({ data });
            logger.info(`Log entry retrieval success: Successfully fetched log entries for user '${req.user.username}'.`);
        } catch (error) {
            logger.error('Log retrieval failure: Encountered an error while fetching log entries. Error details:', error);
            res.status(500).send('Failed to fetch logs');
        }
    });


    router.get('/rfid-logs', ensureAuthenticated, async (req, res) => {
        try {
            const logEntries = await db.getRfidLogEntries();
            res.json(logEntries);
            logger.info(`RFID log entry retrieval success: Successfully fetched RFID log entries for user '${req.user.username}'.`);
        } catch (err) {
            logger.error(`RFID log entry retrieval failure: Encountered an error while fetching RFID log entries. Error details:`, err);
            res.status(500).json({error: `Error retrieving RFID log entries: ${err.message}`});
        }
    });
    
    return router;
};