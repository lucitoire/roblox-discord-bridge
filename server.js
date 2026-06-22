// This is the URL endpoint your Discord bot will send requests to
app.post('/api/give', async (req, res) => {
    try {
        const { userId, dataType, quantity } = req.body;

        if (!userId || !dataType || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const giftPayload = {
            DataType: dataType,
            Quantity: Number(quantity)
        };

        // 1. Check if ANY servers are online by verifying game metadata / location tracking
        // We attempt a MessagingService request first. If it succeeds, it returns a 200, but 
        // to handle 0-player edge cases effectively without tracking state, we look at the response.
        
        // Let's modify the flow: First, try MessagingService.
        const msgResponse = await fetch(
            `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC_NAME}`,
            {
                method: 'POST',
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: JSON.stringify({
                        TargetUserId: userId,
                        DataType: dataType,
                        Quantity: Number(quantity)
                    })
                })
            }
        );

        // 2. Roblox MessagingService API returns 200 OK even if 0 servers are running! 
        // To handle the 0 servers running vulnerability, your bridge can update the OfflineGifts buffer 
        // directly as a failsafe, OR you can look up if players are in-game via a presence endpoint.
        
        // To ensure they ALWAYS get it if no servers are online, we will push it into the "OfflineGifts" DataStore.
        // If a server WAS online, the Lua code handles it. If not, this saves it:
        
        const DATASTORE_NAME = "OfflineGifts";
        const ENTRY_KEY = `Gifts_${userId}`;

        // First, fetch existing pending gifts in the buffer so we don't overwrite previous ones
        const getExistingUrl = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${ENTRY_KEY}`;
        
        let existingGifts = [];
        const getResponse = await fetch(getExistingUrl, {
            method: 'GET',
            headers: { 'x-api-key': API_KEY }
        });

        if (getResponse.ok) {
            try {
                existingGifts = await getResponse.json();
                if (!Array.isArray(existingGifts)) existingGifts = [];
            } catch (e) {
                existingGifts = [];
            }
        }

        // Add the new gift to the array queue
        existingGifts.push(giftPayload);

        // Write the array back to Roblox's Cloud DataStore API
        const setUrl = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${ENTRY_KEY}`;
        const setResponse = await fetch(setUrl, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(existingGifts)
        });

        if (setResponse.ok) {
            // We successfully saved it to the offline backup pool! 
            // We also fired MessagingService just in case they were online.
            return res.status(200).json({ 
                success: true, 
                message: "Gift successfully routed and backed up to Offline DataStores." 
            });
        } else {
            const errText = await setResponse.text();
            console.error("DataStore Backup Failed:", errText);
            return res.status(500).json({ error: "Failed to write to fallback database storage", details: errText });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});