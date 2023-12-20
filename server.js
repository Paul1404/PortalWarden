const express = require('express');
const Database = require('./db'); // Assuming this is your database module
const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON bodies

// Endpoint to add a new RFID code
app.post('/add-rfid', async (req, res) => {
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
app.delete('/remove-rfid/:tagUid', async (req, res) => {
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
    console.log(`Server running on port ${port}`);
});
