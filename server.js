app.post('/api/give', async (req, res) => {
    try {
        const { userId, dataType, quantity } = req.body;

        if (!userId || !dataType || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // ProfileStore puts global messages into an OrderedDataStore named: "M_" + your ProfileStore name
        // Based on your code, your live profile store name is "Spellbound_V1"
        const PROFILE_STORE_NAME = "Spellbound_V1"; 
        const ORDERED_DATASTORE_NAME = `M_${PROFILE_STORE_NAME}`;
        
        // ProfileStore expects the key to look exactly like this for global messages
        const ENTRY_KEY = `U_${userId}`;

        // The payload ProfileStore expects must be JSON encoded inside an array
        const messagePayload = [
            {
                DataType: dataType,
                Quantity: Number(quantity)
            }
        ];

        // Send directly to the ProfileStore global message queue via Open Cloud OrderedDataStores
        const robloxResponse = await fetch(
            `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/ordered-datastores/${ORDERED_DATASTORE_NAME}/scopes/global/entries/${ENTRY_KEY}`,
            {
                method: 'POST',
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: JSON.stringify(messagePayload)
                })
            }
        );

        if (robloxResponse.ok) {
            return res.status(200).json({ success: true, message: "Gift queued in ProfileStore successfully." });
        } else {
            const errorText = await robloxResponse.text();
            console.error("Roblox API Error:", errorText);
            return res.status(500).json({ error: "ProfileStore rejected the message", details: errorText });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});