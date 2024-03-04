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

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error}`);
    process.exit(1);
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error(`Unhandled Rejection: ${error}`);
    process.exit(1);
});

async function startServer() {
    try {
        logger.info('Database connection established.');

        // Start the HTTPS server
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(port, () => {
            logger.info(`HTTPS Server running on https://localhost:${port}`);
        });

        // Handle server errors
        httpsServer.on('error', (error) => {
            logger.error(`HTTPS Server error: ${error}`);
            process.exit(1);
        });

    } catch (error) {
        // Log any error that occurred during the startup process
        logger.error(`Failed to start the server: ${error}`);
        process.exit(1); // Exit the process if the server fails to start
    }
}


startServer().then(() => {
    logger.info('Server started successfully.');
}).catch(error => {
    logger.error('Server failed to start:', error);
    process.exit(1);
});
