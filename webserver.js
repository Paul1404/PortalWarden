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

const app = express();
const port = 3000;

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
      console.log('.env file not found, creating...');
      fs.writeFileSync(envFile, '');
    }

    // Load the .env file
    dotenv.config();

    // Check if SESSION_SECRET is already set
    if (!process.env.SESSION_SECRET) {
      console.log('Generating a new SESSION_SECRET...');
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
        console.log(`Attempting to authenticate user: ${username}`);
        const user = await db.findUserByUsername(username);

        if (!user) {
          console.log('Authentication failed: User not found');
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        console.log(`User from DB: ${JSON.stringify(user)}`); // Enhanced logging

        const isMatch = await db.verifyUserPassword(username, password);
        if (isMatch) {
          console.log('Authentication successful');
          return done(null, user);
        } else {
          console.log('Authentication failed: Incorrect password');
          return done(null, false, { message: 'Incorrect username or password.' });
        }
      } catch (error) {
        console.error(`Authentication error: ${error}`);
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

// [Rest of your Express app code...]


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
    console.log(`User logged out: ${req.user.username}`);
    req.logout();
    res.redirect('/login');
});

/**
 * Middleware to ensure user is authenticated.
 */
function ensureAuthenticated(req, res, next) {
    console.log(`Attempting to access: ${req.originalUrl}`);
    if (req.isAuthenticated()) {
        return next();
    }
    console.log('Access denied: User not authenticated');
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
    console.log(`Adding RFID tag: ${tagUid}`);
    const db = new Database();

    try {
        await db.insertRfidTag(tagUid);
        console.log(`RFID tag ${tagUid} added successfully`);
        res.status(200).send(`RFID tag ${tagUid} added successfully.`);
    } catch (error) {
        console.error(`Error adding RFID tag: ${error.message}`);
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
    console.log(`Removing RFID tag: ${tagUid}`);
    const db = new Database();

    try {
        await db.removeRfidTag(tagUid);
        console.log(`RFID tag ${tagUid} removed successfully`);
        res.status(200).send(`RFID tag ${tagUid} removed successfully.`);
    } catch (error) {
        console.error(`Error removing RFID tag: ${error.message}`);
        res.status(500).send(`Error removing RFID tag: ${error.message}`);
    } finally {
        db.close();
    }
});


app.listen(port, () => {
    ensureEnvSecret()
    console.log(`Server running on http://localhost:${port}`);
});
