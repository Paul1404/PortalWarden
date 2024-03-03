const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const expressSession = require('express-session');
const Database = require('./db');
const db = new Database();
const fs = require('fs'); // For sync operations
const fsPromises = require('fs').promises; // For async operations
const https = require('https');
const argon2 = require('argon2');
const crypto = require('crypto');
const dotenv = require('dotenv'); // Require the module for later use
dotenv.config(); // Immediately invoke config to load the environment variables
const readline = require('readline');
let httpsServer; // Global variable to hold the HTTPS server instance

const app = express();
const port = 3000;

const createLogger = require('./logger');
const logger = createLogger(__filename);


// Update the file paths to point to the ssl directory
const privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'), 'utf8');
const credentials = {key: privateKey, cert: certificate};

app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));


app.use(expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {secure: true, httpOnly: true} // secure:true is recommended for HTTPS connections
}));


passport.use(new LocalStrategy(
    {
        usernameField: 'username',
        passwordField: 'password',
        session: true
    },
    async (username, password, done) => {
        try {
            logger.info(`Attempting to authenticate user: ${username}`);
            const user = await db.findUserByUsername(username);

            if (!user) {
                logger.info('Authentication failed: User not found');
                // It's best practice to use the same error message for both username and password to prevent user enumeration
                return done(null, false, {message: 'Incorrect username or password.'});
            }

            const isMatch = await db.verifyUserPassword(username, password);
            if (isMatch) {
                logger.info('Authentication successful');

                // Create a new object that omits the password before passing to done to enhance security
                const safeUser = {
                    id: user.id,
                    username: user.username
                };

                return done(null, safeUser); // Pass the safe user object instead of the full user record
            } else {
                logger.info('Authentication failed: Incorrect password');
                return done(null, false, {message: 'Incorrect username or password.'});
            }
        } catch (error) {
            logger.error(`Authentication error: ${error}`);
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
    logger.info(`Attempting to access: ${req.originalUrl}`);
    if (req.isAuthenticated()) {
        return next();
    }
    logger.info('Access denied: User not authenticated');
    res.redirect('/login');
}

const routes = require('./routes')({ db, logger, ensureAuthenticated });

app.use('/', routes);

function setupKeypressListener(db, server) {
    if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        process.stdin.on('keypress', async (str, key) => {
            if (key.ctrl && key.name === 'x') {
                logger.info('Ctrl+X pressed. Initiating shutdown...');

                // Close the HTTPS server
                if (server) {
                    server.close(() => {
                        logger.info('HTTPS server closed.');
                    });
                }

                // Disconnect from the database using the new method in the Database class
                try {
                    await db.disconnect();
                    logger.info('Database connection closed.');
                } catch (error) {
                    logger.error('Error closing database connection:', error);
                }

                // Exit the process
                process.exit(0);
            }
        });
    } else {
        logger.info('Running in a non-interactive environment. Keypress listener disabled.');
    }
}


async function main() {
    try {
        httpsServer = https.createServer(credentials, app); // Store the server instance in the global variable
        httpsServer.listen(port, () => {
            logger.info(`HTTPS Server running on https://localhost:${port}`);
        });

        setupKeypressListener(db, httpsServer); // Pass the server instance to the listener function
    } catch (error) {
        logger.error('Failed to start the application:', error);
        process.exit(1);
    }
}

main().catch(error => {
    logger.error('Unhandled error in main:', error);
    process.exit(1);
});
