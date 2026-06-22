// Replace your app.post('/api/give') endpoint with this:
app.post('/api/give', async (req, res) => {
    try {
        const { userId, dataType, quantity } = req.body;

        if (!userId || !dataType || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const DATASTORE_NAME = "DiscordGiftsInbox";
        const ENTRY_KEY = `Player_${userId}`;

        // 1. Fetch existing pending gifts for this user so we don't overwrite previous unclaimed gifts
        let existingGifts = [];
        const getResponse = await fetch(
            `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${ENTRY_KEY}`,
            { headers: { 'x-api-key': API_KEY } }
        );

        if (getResponse.ok) {
            existingGifts = await getResponse.json();
        }

        // 2. Append the new gift to their inbox queue
        existingGifts.push({ dataType, quantity: Number(quantity) });

        // 3. Save it back to the Roblox DataStore
        const robloxResponse = await fetch(
            `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${ENTRY_KEY}`,
            {
                method: 'POST', // Open Cloud uses POST to set/create entries
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(existingGifts)
            }
        );

        if (robloxResponse.ok) {
            // 4. OPTIONAL: Send a MessagingService ping just in case they are currently online
            fetch(`https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/DiscordAdminCommands`, {
                method: 'POST',
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: JSON.stringify({ TargetUserId: userId }) })
            }).catch(() => {}); // Safely ignore if messaging fails/no servers open

            return res.status(200).json({ success: true, message: "Saved to Roblox DataStore successfully." });
        } else {
            const errorText = await robloxResponse.text();
            console.error("Roblox API Error:", errorText);
            return res.status(500).json({ error: "Roblox DataStore rejected the write", details: errorText });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});