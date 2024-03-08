const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const expressSession = require('express-session');
const Database = require('./db');
const db = new Database();
const fs = require('fs');
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

// Create a new Express application instance
const app = express();
// Define the port to listen on, either from environment variables or default to 3000
const port = process.env.PORT || 3000;

// Custom module imports
const createLogger = require('./logger');
// Initialize custom logger with the current filename for context
const logger = createLogger(__filename);

// Read SSL private key and certificate for HTTPS server configuration
const privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'), 'utf8');
// Combine key and certificate in credentials object
const credentials = { key: privateKey, cert: certificate };

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));
// Middleware to enable CORS (Cross-Origin Resource Sharing)
app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to serve static files from 'public' directory
app.use(express.static('public'));

// Initialize express-session to manage session state
app.use(expressSession({
    secret: process.env.SESSION_SECRET, // Secret used to sign the session ID cookie
    resave: false, // Avoid saving session if it hasn't changed
    saveUninitialized: false, // Don't create a session until something is stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Secure cookies in production
        httpOnly: true, // Mitigate XSS attacks by preventing client-side script access to the cookie
        maxAge: 86400000 //cookie expiry set to 24 hours
    }
}));


/**
 * Use a LocalStrategy within Passport for user authentication.
 * It checks the provided username and password against the stored credentials.
 * If authentication is successful, it returns a user object, otherwise it returns false.
 */
passport.use(new LocalStrategy(
    {
        usernameField: 'username',
        passwordField: 'password',
        session: true
    },
    async (username, password, done) => {
        try {
            logger.info(`Authentication attempt for user: '${username}' initiated.`);
            const user = await db.findUserByUsername(username);

            if (!user) {
                logger.info(`Authentication failure: No user matching username: '${username}' found.`);
                return done(null, false, {message: 'Incorrect username or password.'});
            }

            const isMatch = await db.verifyUserPassword(username, password);
            if (isMatch) {
                logger.info(`Authentication success: User '${username}' successfully authenticated.`);
                const safeUser = {
                    id: user.id,
                    username: user.username
                };
                return done(null, safeUser);
            } else {
                logger.info(`Authentication failure: Incorrect password for user '${username}'.`);
                return done(null, false, {message: 'Incorrect username or password.'});
            }
        } catch (error) {
            logger.error(`Authentication error: An unexpected issue occurred during user '${username}' authentication. Error: ${error}.`);
            return done(null, false, {message: 'An error occurred during authentication.'});
        }
    }
    ));

// Initialize Passport and its session management
app.use(passport.initialize());
app.use(passport.session(undefined));

/**
 * Serialize the user object to the session.
 * Here, only the user ID is stored in the session to keep the stored data minimal.
 * This ID is then used to retrieve the full user object on subsequent requests.
 *
 * @param {Object} user - The user object from the authentication strategy.
 * @param {Function} done - A callback to be called with the user ID to be stored in the session.
 */
passport.serializeUser((user, done) => {
    done(null, user.id);
});

/**
 * Deserialize the user object from the session.
 * The user ID stored in the session during serialization is used to retrieve the full user object.
 * This is useful for maintaining user data across different requests.
 *
 * @param {number} id - The user ID stored in the session.
 * @param {Function} done - A callback to be called with the retrieved user object.
 */
passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.findUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});


/**
 * Middleware to ensure the request is authenticated.
 * Logs the HTTP method, the requested URL, and the client IP address to provide context.
 * If the request is authenticated, it proceeds to the next middleware.
 * Otherwise, it redirects the user to the login page and logs the access attempt.
 *
 * @param {Object} req - The request object from Express.js, containing request details.
 * @param {Object} res - The response object from Express.js, used to send a response to the client.
 * @param {Function} next - The next middleware function in the stack.
 */
function ensureAuthenticated(req, res, next) {
    logger.info(`Access attempt: ${req.method} request to '${req.originalUrl}' from IP '${req.ip}'. Authentication check initiated.`);

    if (req.isAuthenticated()) {
        logger.info(`Access granted: Authenticated user with IP '${req.ip}' successfully accessed '${req.originalUrl}'.`);
        return next();
    }

    logger.info(`Access denied: Unauthenticated request from IP '${req.ip}' for '${req.originalUrl}'. Redirecting to login.`);
    res.redirect('/login');
}

// Importing Routes from routes.js
const routes = require('./routes')({ db, logger, ensureAuthenticated });
app.use('/', routes);

/**
 * Global handler for uncaught exceptions.
 * Logs the error and exits the application to prevent running in an unstable state.
 */
process.on('uncaughtException', (error) => {
    logger.error(`Critical: Uncaught exception encountered. Application will terminate. Error details: ${error}.`);
    process.exit(1);
});

/**
 * Global handler for unhandled promise rejections.
 * Logs the error and exits the application to maintain security and stability.
 */
process.on('unhandledRejection', (error) => {
    logger.error(`Critical: Unhandled promise rejection detected. Application will terminate. Error details: ${error}.`);
    process.exit(1);
});


/**
 * Asynchronously starts the server with HTTPS and connects to the database.
 * This function initializes the HTTPS server using predefined credentials and the Express app.
 * It also sets up error handling for server errors. If an error occurs during the startup,
 * the application will log the error and terminate.
 */
async function startServer() {
    try {
        // Log successful database connection
        logger.info('Database connection: Successful Sync with the Prisma ORM');

        // Initialize and start the HTTPS server
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(port, () => {
            logger.info(`Server startup: HTTPS server is now running at https://localhost:${port}. Awaiting incoming connections.`);
        });

        // Set up an error handler for the HTTPS server
        httpsServer.on('error', (error) => {
            logger.error(`Server error: Encountered an issue with the HTTPS server. Error details: ${error}. Application will terminate.`);
            process.exit(1); // Terminate the application on server error
        });

    } catch (error) {
        // Catch and log any error that occurs during the server startup process
        logger.error(`Startup failure: Server did not start due to an error. Error details: ${error}. Application will terminate.`);
        process.exit(1); // Exit the process if an error occurs during startup
    }
}

// Execute startServer and handle the resolved promise or catch any errors
startServer().then(() => {
    logger.info('Server started successfully.');
}).catch(error => {
    logger.error('Server failed to start:', error);
    process.exit(1); // Ensure the process exits if the server fails to start
});

