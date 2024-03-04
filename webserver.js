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

const app = express();
const port = process.env.PORT || 3000;

const createLogger = require('./logger');
const logger = createLogger(__filename);

const privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use(expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true }
}));


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
                logger.info(`Authentication failure: No user matching username: '${username}' found. Check username and try again.`);
                // It's best practice to use the same error message for both username and password to prevent user enumeration
                return done(null, false, {message: 'Incorrect username or password.'});
            }

            const isMatch = await db.verifyUserPassword(username, password);
            if (isMatch) {
                logger.info(`Authentication success: User '${username}' successfully authenticated.`);

                // Create a new object that omits the password before passing to done to enhance security
                const safeUser = {
                    id: user.id,
                    username: user.username
                };

                return done(null, safeUser); // Pass the safe user object instead of the full user record
            } else {
                logger.info(`Authentication failure: Incorrect password for user '${username}'. Ensure credentials are correct.`);
                return done(null, false, {message: 'Incorrect username or password.'});
            }
        } catch (error) {
            logger.error(`Authentication error: An unexpected issue occurred during user '${username}' authentication. Error details: ${error}.`);
            // Return a generic error message to avoid exposing details of the error
            return done(null, false, {message: 'An error occurred during authentication.'});
        }
    }
));

app.use(passport.initialize());
app.use(passport.session(undefined));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.findUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

function ensureAuthenticated(req, res, next) {
    // Improved to include the HTTP method and client IP address for better context.
    logger.info(`Access attempt: ${req.method} request to '${req.originalUrl}' from IP '${req.ip}'. Authentication check initiated.`);

    if (req.isAuthenticated()) {
        // Logging success with additional context for auditing purposes.
        logger.info(`Access granted: Authenticated user with IP '${req.ip}' successfully accessed '${req.originalUrl}'.`);
        return next();
    }

    // Providing detailed reason for access denial to help in identifying potential security issues or misconfigurations.
    logger.info(`Access denied: Unauthenticated request from IP '${req.ip}' for '${req.originalUrl}'. Redirecting to login.`);
    res.redirect('/login');
}


const routes = require('./routes')({ db, logger, ensureAuthenticated });
app.use('/', routes);

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Critical: Uncaught exception encountered. Application will terminate. Error details: ${error}.`);
    process.exit(1);
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error(`Critical: Unhandled promise rejection detected. Application will terminate. Error details: ${error}.`);
    process.exit(1);
});

async function startServer() {
    try {
        logger.info('Database connection: Successfull Sync with the Prisma ORM');
        // Start the HTTPS server
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(port, () => {
            logger.info(`Server startup: HTTPS server is now running at https://localhost:${port}. Awaiting incoming connections.`);
        });

        // Handle server errors
        httpsServer.on('error', (error) => {
            logger.error(`Server error: Encountered an issue with the HTTPS server. Error details: ${error}. Application will terminate.`);
            process.exit(1);
        });

    } catch (error) {
        // Log any error that occurred during the startup process
        logger.error(`Startup failure: Server did not start due to an error. Error details: ${error}. Application will terminate.`);
        process.exit(1); // Exit the process if the server fails to start
    }
}


startServer().then(() => {
    logger.info('Server started successfully.');
}).catch(error => {
    logger.error('Server failed to start:', error);
    process.exit(1);
});
