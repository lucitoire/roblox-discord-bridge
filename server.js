const express = require('express');
const app = express();

// This allows your server to read JSON data sent by your Discord Bot
app.use(express.json());

// Replace these with your actual Roblox details
const UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_API_KEY;
const TOPIC_NAME = "DiscordAdminCommands";

// This is the URL endpoint your Discord bot will send requests to
// Replace your current app.post('/api/give') with this:
app.post('/api/give', async (req, res) => {
    try {
        const { userId, dataType, quantity } = req.body;

        if (!userId || !dataType || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const DATASTORE_NAME = "Spellbound_V1"; // Must match your Roblox script
        const ENTRY_KEY = `Queue_${userId}`;

        // 1. Get existing pending commands for this user (if any)
        let existingQueue = [];
        const getResponse = await fetch(
            `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${ENTRY_KEY}`,
            { headers: { 'x-api-key': API_KEY } }
        );

        if (getResponse.ok) {
            existingQueue = await getResponse.json();
        }

        // 2. Append the new command to their queue
        existingQueue.push({
            DataType: dataType,
            Quantity: Number(quantity),
            Id: Date.now() // Unique identifier
        });

        // 3. Save it back to Roblox DataStores natively
        const setResponse = await fetch(
            `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${ENTRY_KEY}`,
            {
                method: 'POST',
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(existingQueue)
            }
        );

        if (setResponse.ok) {
            return res.status(200).json({ success: true, message: "Saved straight to DataStore queue!" });
        } else {
            const errorText = await setResponse.text();
            return res.status(500).json({ error: "DataStore write failed", details: errorText });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal error" });
    }
});

// Start the webserver
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});