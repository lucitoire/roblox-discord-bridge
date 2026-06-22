const express = require('express');
const app = express();

// This allows your server to read JSON data sent by your Discord Bot
app.use(express.json());

// Replace these with your actual Roblox details
const UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_API_KEY;
const TOPIC_NAME = "DiscordAdminCommands";

// This is the URL endpoint your Discord bot will send requests to
app.post('/api/give', async (req, res) => {
    try {
        const { userId, dataType, quantity } = req.body;

        if (!userId || !dataType || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Send request to Roblox Open Cloud MessagingService
        const robloxResponse = await fetch(
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

        if (robloxResponse.ok) {
            return res.status(200).json({ success: true, message: "Dispatched to Roblox successfully." });
        } else {
            const errorText = await robloxResponse.text();
            console.error("Roblox API Error:", errorText);
            return res.status(500).json({ error: "Roblox API rejected the message", details: errorText });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Start the webserver
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});