const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const expressSession = require('express-session');
const Database = require('./db');
const db = new Database();
require('dotenv').config();
const fs = require('fs');
const argon2 = require('argon2');
const envFile = './.env';
const dotenv = require('dotenv');
const readline = require('readline');



const app = express();
const port = 3000;

const createLogger = require('./logger');
const logger = createLogger(__filename);


app.use(express.urlencoded({ extended: true }));

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Support JSON encoded bodies
app.use(express.json());

/**
 * Ensures that the .env file exists and contains a SESSION_SECRET.
 * If the .env file doesn't exist, it's created. If the SESSION_SECRET
 * is not set, it's generated using argon2 and appended to the .env file.
 */
async function ensureEnvSecret() {
    const envFile = './.env';

    // Check if .env file exists, if not, create it
    if (!fs.existsSync(envFile)) {
      logger.info('.env file not found, creating...');
      fs.writeFileSync(envFile, '');
    }

    // Load the .env file
    dotenv.config();

    // Check if SESSION_SECRET is already set
    if (!process.env.SESSION_SECRET) {
      logger.info('Generating a new SESSION_SECRET...');
      const secretKey = await argon2.hash('some_random_string', { type: argon2.argon2id });
      fs.appendFileSync(envFile, `SESSION_SECRET=${secretKey}\n`);
      process.env.SESSION_SECRET = secretKey; // Set the environment variable
    }
}

/**
 * Express session middleware setup.
 */
app.use(expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

/**
 * Passport authentication setup using local strategy.
 * This strategy involves a basic username and password mechanism.
 */
passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        logger.info(`Attempting to authenticate user: ${username}`);
        const user = await db.findUserByUsername(username);

        if (!user) {
          logger.info('Authentication failed: User not found');
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        logger.info(`User from DB: ${JSON.stringify(user)}`); // Enhanced logging

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

// Initialize Passport authentication middleware
app.use(passport.initialize());
app.use(passport.session());

/**
 * Serializes the user for the session. Stores the user ID in the session.
 * @param {Object} user - The user object to serialize.
 * @param {Function} done - The callback function.
 */
passport.serializeUser((user, done) => {
    done(null, user.id);  // Store user's ID in the session
});

/**
 * Deserializes the user from the session. Retrieves the user object based on the ID.
 * @param {number} id - The user ID.
 * @param {Function} done - The callback function.
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.findUserById(id);
    done(null, user);  // Retrieves user object based on ID from the session
  } catch (error) {
    done(error, null);
  }
});


/**
 * Route to serve the background image.
 */
app.get('/UI-Background.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'UI-Background.jpg'));
});

app.get('/', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'index.html'));
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

/**
 * Route to serve the login page.
 */
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/**
 * Route to handle login using passport authentication.
 */
app.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: false
    })(req, res, next);
});


/**
 * Route to handle logout.
 */
app.get('/logout', (req, res) => {
    logger.info(`User logged out: ${req.user.username}`);
    req.logout();
    res.redirect('/login');
});

/**
 * Middleware to ensure user is authenticated.
 */
function ensureAuthenticated(req, res, next) {
    logger.info(`Attempting to access: ${req.originalUrl}`);
    if (req.isAuthenticated()) {
        return next();
    }
    logger.info('Access denied: User not authenticated');
    res.redirect('/login');
}


/**
 * Route to serve the main page, requires authentication.
 */
app.get('/', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


/**
 * Endpoint to add a new RFID code.
 * @param {string} tagUid - The UID of the RFID tag to add.
 */
app.post('/add-rfid', ensureAuthenticated, async (req, res) => {
    const tagUid = req.body.tagUid;
    logger.info(`Adding RFID tag: ${tagUid}`);
    const db = new Database();

    try {
        await db.insertRfidTag(tagUid);
        logger.info(`RFID tag ${tagUid} added successfully`);
        res.status(200).send(`RFID tag ${tagUid} added successfully.`);
    } catch (error) {
        logger.error(`Error adding RFID tag: ${error.message}`);
        res.status(500).send(`Error adding RFID tag: ${error.message}`);
    } finally {
        db.close();
    }
});

/**
 * Endpoint to remove an RFID tag.
 * @param {string} tagUid - The UID of the RFID tag to remove.
 */
app.delete('/remove-rfid/:tagUid', ensureAuthenticated, async (req, res) => {
    const tagUid = req.params.tagUid;
    logger.info(`Removing RFID tag: ${tagUid}`);
    const db = new Database();

    try {
        await db.removeRfidTag(tagUid);
        logger.info(`RFID tag ${tagUid} removed successfully`);
        res.status(200).send(`RFID tag ${tagUid} removed successfully.`);
    } catch (error) {
        logger.error(`Error removing RFID tag: ${error.message}`);
        res.status(500).send(`Error removing RFID tag: ${error.message}`);
    } finally {
        db.close();
    }
});

/**
 * Sets up a keypress listener to handle Ctrl+X for a graceful shutdown.
 * @param {Database} db - The database connection to close on shutdown.
 */
function setupKeypressListener(db) {
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', async (str, key) => {
      if (key.ctrl && key.name === 'x') {
        logger.info('Ctrl+X pressed. Initiating shutdown...');
        await gracefulShutdown(db);
      }
    });
  } else {
    logger.info('Running in a non-interactive environment. Keypress listener disabled.');
  }
}

/**
* Handles the graceful shutdown of the application.
* Closes the database connection and exits the process.
* @param {Database} db - The database connection to close.
*/
async function gracefulShutdown(db) {
  logger.info('Database connection closed.');
  process.exit(0);
}



/**
 * The main function where the application is initialized and started.
 */
async function main() {
  try {
    // Ensure the environment secret is set up
    await ensureEnvSecret();

    // Set up the keypress listener for graceful shutdown
    setupKeypressListener(db);

    // Start the Express server
    app.listen(port, () => {
      logger.info(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Failed to start the application:', error);
    process.exit(1);
  }
}

// Run the main function to start the application
main();
