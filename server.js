const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const expressSession = require('express-session');
const Database = require('./db');


const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Express session setup
app.use(expressSession({
  secret: 'your_secret_key', // Replace with a real secret key
  resave: false,
  saveUninitialized: false
}));

passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const user = await db.findUserByUsername(username);
        if (user && user.password === password) {
            return done(null, user);
        }
        return done(null, false, { message: 'Incorrect username or password.' });
      } catch (error) {
        return done(error);
      }
    }
  ));

app.use(passport.initialize());
app.use(passport.session());

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: false
}));

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.get('/', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Endpoint to add a new RFID code
app.post('/add-rfid', ensureAuthenticated, async (req, res) => {
    const tagUid = req.body.tagUid;
    const db = new Database();

    try {
        await db.insertRfidTag(tagUid);
        res.status(200).send(`RFID tag ${tagUid} added successfully.`);
    } catch (error) {
        res.status(500).send(`Error adding RFID tag: ${error.message}`);
    } finally {
        db.close();
    }
});

// Endpoint to remove an RFID tag
app.delete('/remove-rfid/:tagUid', ensureAuthenticated, async (req, res) => {
    const tagUid = req.params.tagUid;
    const db = new Database();

    try {
        await db.removeRfidTag(tagUid);
        res.status(200).send(`RFID tag ${tagUid} removed successfully.`);
    } catch (error) {
        res.status(500).send(`Error removing RFID tag: ${error.message}`);
    } finally {
        db.close();
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
