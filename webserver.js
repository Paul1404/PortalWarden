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
const argon2 = require('argon2');
require('dotenv').config();
const readline = require('readline');
let httpsServer; // Global variable to hold the HTTPS server instance

const app = express();
const port = 3000;

const createLogger = require('./logger');
const logger = createLogger(__filename);

// Update the file paths to point to the ssl directory
const privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

async function ensureEnvSecret() {
    const envFile = './.env';

    if (!fs.existsSync(envFile)) {
        logger.info('.env file not found, creating...');
        fs.writeFileSync(envFile, '');
    }

    if (!process.env.SESSION_SECRET) {
        logger.info('Generating a new SESSION_SECRET...');
        const secretKey = await argon2.hash('some_random_string', { type: argon2.argon2id });
        fs.appendFileSync(envFile, `SESSION_SECRET=${secretKey}\n`);
        // Reload .env file after updating it
        require('dotenv').config();
        process.env.SESSION_SECRET = secretKey;
    }
}

app.use(expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true }
}));

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            logger.info(`Attempting to authenticate user: ${username}`);
            const user = await db.findUserByUsername(username);

            if (!user) {
                logger.info('Authentication failed: User not found');
                return done(null, false, { message: 'Incorrect username or password.' });
            }

            const isMatch = await db.verifyUserPassword(username, password);
            if (isMatch) {
                logger.info('Authentication successful');
                return done(null, user);
            } else {
                logger.info('Authentication failed: Incorrect password');
                return done(null, false, { message: 'Incorrect username or password.' });
            }
        } catch (error) {
            logger.error(`Authentication error: ${error}`);
            return done(error);
        }
    }
));

app.use(passport.initialize());
app.use(passport.session());

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

app.get('/UI-Background.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'UI-Background.jpg'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

app.get('/site.webmanifest', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'site.webmanifest'));
});

app.get('/', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: false
    })(req, res, next);
});

app.get('/logout', (req, res) => {
    const username = req.user ? req.user.username : 'Unknown';
    logger.info(`User logged out: ${username}`);

    req.logout(function(err) {
        if (err) {
            logger.error('Error during logout:', err);
            return next(err);
        }
        res.redirect('/login');
    });
});

function ensureAuthenticated(req, res, next) {
    logger.info(`Attempting to access: ${req.originalUrl}`);
    if (req.isAuthenticated()) {
        return next();
    }
    logger.info('Access denied: User not authenticated');
    res.redirect('/login');
}

app.post('/add-rfid', ensureAuthenticated, async (req, res) => {
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

app.get('/users', ensureAuthenticated, async (req, res) => {
    try {
        const users = await db.getUsers();
        logger.info("Users fetched:", users);
        res.json(users);
    } catch (err) {
        logger.error("Error retrieving users:", err);
        res.status(500).json({ error: `Error retrieving users: ${err.message}` });
    }
});

app.get('/rfid-tags', ensureAuthenticated, async (req, res) => {
    try {
        const tags = await db.getRfidTags();
        logger.info("RFID tags fetched:", tags);
        res.json(tags);
    } catch (err) {
        logger.error("Error retrieving RFID tags:", err);
        res.status(500).json({ error: `Error retrieving RFID tags: ${err.message}` });
    }
});

app.delete('/remove-rfid/:tagUid', ensureAuthenticated, async (req, res) => {
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

app.post('/add-user', ensureAuthenticated, async (req, res) => {
    const { username, password } = req.body;
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

app.delete('/remove-user/:username', ensureAuthenticated, async (req, res) => {
    const { username } = req.params;
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

app.get('/rfid-logs', ensureAuthenticated, async (req, res) => {
    try {
        const logEntries = await db.getRfidLogEntries();
        res.json(logEntries);
    } catch (err) {
        logger.error("Error retrieving RFID log entries:", err);
        res.status(500).json({ error: `Error retrieving RFID log entries: ${err.message}` });
    }
});

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
        await ensureEnvSecret();
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

main();
