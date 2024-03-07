const express = require('express');
const passport = require('passport');
const path = require('path');

/**
 * Creates and configures an Express router for a web application.
 * This function sets up routes for serving a private index page and handling login logic,
 * including authentication via Passport.js.
 *
 * @param {Object} config An object containing dependencies needed by the router.
 * @param {Object} config.db The database connection object.
 * @param {Object} config.logger The logging utility to record events.
 * @param {Function} config.ensureAuthenticated Middleware function to ensure a user is authenticated.
 * @returns {express.Router} A configured Express.js router with routes for the application.
 */
module.exports = function({ db, logger, ensureAuthenticated }) {
    const router = express.Router();

    /**
     * Route serving the private index page. Only accessible to authenticated users.
     * Logs the successful serving of the page along with the username and IP of the user.
     *
     * @route GET /
     * @protected
     */
    router.get('/', ensureAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, 'private', 'index.html'));
        logger.info(`Private index page served successfully to authenticated user '${req.user.username}' from IP '${req.ip}'.`);
    });

    /**
     * Route serving the login page. Accessible to any visitor.
     * Logs the action including the client's IP address.
     *
     * @route GET /login
     */
    router.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
        logger.info(`Login page served to client IP '${req.ip}'.`);
    });

    /**
     * Route handling the login logic. Authenticates users via a local strategy.
     * Redirects the user based on the success or failure of the authentication process.
     *
     * @route POST /login
     */
    router.post('/login', (req, res, next) => {
        passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/login',
            failureFlash: false
        })(req, res, next);
    });


     /**
     * Route for handling user logout. It logs the logout attempt, terminates the user session, and redirects to the login page.
     * If there's an error during logout, logs the error and passes it to the next error handling middleware.
     *
     * @route GET /logout
     * @param {express.Request} req - The request object, containing user session data.
     * @param {express.Response} res - The response object, used for redirecting to the login page.
     * @param {express.NextFunction} next - The next middleware function in the stack, used for error handling.
     */
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

        /**
     * Route for adding an RFID tag to a user. This route is protected and requires authentication.
     * It extracts the RFID tag UID and target username from the request body, attempts to add the tag, and responds accordingly.
     *
     * @route POST /add-rfid
     * @param {express.Request} req - The request object, containing RFID data in the body.
     * @param {express.Response} res - The response object, used to send back the operation status.
     * @protected - This route requires authentication.
     */
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


        /**
     * Route for retrieving a list of users. This route is protected and requires authentication.
     * It attempts to fetch the user list from the database and responds with the list or an error message.
     *
     * @route GET /users
     * @param {express.Request} req - The request object.
     * @param {express.Response} res - The response object, used to send back the user list or an error message.
     * @protected - This route requires authentication.
     */
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


        /**
     * Route for retrieving RFID tags. This route is protected and requires authentication.
     * It attempts to fetch RFID tags from the database and responds with the tags or an error message.
     *
     * @route GET /rfid-tags
     * @param {express.Request} req - The request object.
     * @param {express.Response} res - The response object, used to send back the RFID tags or an error message.
     * @protected - This route requires authentication.
     */
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

    /**
     * Route for removing an RFID tag by its UID. This route is protected and requires authentication.
     * It extracts the UID from the route parameters, attempts to remove the corresponding RFID tag, and responds accordingly.
     *
     * @route DELETE /remove-rfid/:tagUid
     * @param {express.Request} req - The request object, containing the UID of the RFID tag to be removed.
     * @param {express.Response} res - The response object, used to send back the operation status.
     * @protected - This route requires authentication.
     */
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

    /**
     * Route for adding a new user. This route is protected and requires authentication.
     * It extracts the username and password from the request body, attempts to add the new user, and responds accordingly.
     *
     * @route POST /add-user
     * @param {express.Request} req - The request object, containing the new user's username and password in the body.
     * @param {express.Response} res - The response object, used to send back the operation status.
     * @protected - This route requires authentication.
     */
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

    /**
     * Route for removing a user by username. This route is protected and requires authentication.
     * It extracts the username from the route parameters, attempts to remove the user, and responds accordingly.
     *
     * @route DELETE /remove-user/:username
     * @param {express.Request} req - The request object, containing the username of the user to be removed.
     * @param {express.Response} res - The response object, used to send back the operation status.
     * @protected - This route requires authentication.
     */
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


        /**
     * Route for serving the Log Explorer page. This route is protected and requires authentication.
     * It serves the static HTML file for the Log Explorer interface.
     *
     * @route GET /log-explorer
     * @param {express.Request} req - The request object, containing user session data.
     * @param {express.Response} res - The response object, used for sending the Log Explorer HTML file.
     * @protected - This route requires authentication.
     */
    router.get('/log-explorer', ensureAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, 'private', 'log-explorer.html'));
        logger.info(`Log explorer page served successfully to authenticated user '${req.user.username}' from IP '${req.ip}'.`);
    });

        /**
     * Route for retrieving log entries. This route is protected and requires authentication.
     * It attempts to fetch log entries from the database and responds with the data or an error message.
     *
     * @route GET /api/logs
     * @param {express.Request} req - The request object.
     * @param {express.Response} res - The response object, used to send back the log entries or an error message.
     * @protected - This route requires authentication.
     */
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

        /**
     * Route for retrieving RFID log entries. This route is protected and requires authentication.
     * It attempts to fetch RFID log entries from the database and responds with the data or an error message.
     *
     * @route GET /rfid-logs
     * @param {express.Request} req - The request object.
     * @param {express.Response} res - The response object, used to send back the RFID log entries or an error message.
     * @protected - This route requires authentication.
     */
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