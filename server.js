app.post('/api/give', async (req, res) => {
    try {
        const { userId, dataType, quantity } = req.body;

        if (!userId || !dataType || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Change this to match your live profile store name ("Spellbound_V1")
        const PROFILE_STORE_NAME = "Spellbound_V1"; 
        const ENTRY_KEY = `Player_${userId}`;

        const robloxUrl = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores/datastore/entries/entry?datastoreName=${PROFILE_STORE_NAME}&entryKey=${ENTRY_KEY}`;

        // 1. Fetch the user's actual ProfileStore profile
        const getResponse = await fetch(robloxUrl, {
            headers: { 'x-api-key': API_KEY }
        });

        let profileWrapper = { Data: { Files: [], Inbox: [] } };

        if (getResponse.ok) {
            profileWrapper = await getResponse.json();
        } else if (getResponse.status !== 404) {
            // If it's not a 404 (new player), something else went wrong
            const errorText = await getResponse.text();
            return res.status(500).json({ error: "Failed to fetch profile", details: errorText });
        }

        // 2. Ensure the Inbox array exists in their data
        if (!profileWrapper.Data.Inbox) {
            profileWrapper.Data.Inbox = [];
        }

        // 3. Push the new reward into their ProfileStore Inbox
        profileWrapper.Data.Inbox.push({
            DataType: dataType,
            Quantity: Number(quantity)
        });

       // 4. Save the updated Profile back to Roblox
        const saveResponse = await fetch(robloxUrl, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileWrapper)
        });

        if (saveResponse.ok) {
            // 5. Fire a standard MessagingService topic just in case they ARE online
            // REPLACE YOUR OLD FETCH CALL WITH THIS ONE:
            fetch(`https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/DiscordAdminCommands`, {
                method: 'POST',
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: JSON.stringify({ 
                        TargetUserId: userId, 
                        DataType: dataType, 
                        Quantity: quantity 
                    }) 
                })
            }).catch(() => {});

            return res.status(200).json({ success: true, message: "Gift injected into ProfileStore successfully." });
        } else {
            const errorText = await saveResponse.text();
            return res.status(500).json({ error: "Failed to write back to ProfileStore", details: errorText });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});