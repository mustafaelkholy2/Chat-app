import express from "express";
import { WebSocketServer } from "ws";
import knex from "knex";
import knexConfig from "./knexfile.js";
import { router as messagesRouter } from "./routers/messagesRoutes.js";


const app = express();
const db = knex(knexConfig);
const wss = new WebSocketServer({ port: 8080 });

/* Bonus Task 1 */
const clients = new Map();

wss.on("connection", (ws) => {
    let username = null;

    ws.on("message", async (message) => {
        try {
            const data = JSON.parse(message);

            // User Connection
            if (data.username && !username) {
                username = data.username;
                clients.set(username, ws); // Save connected clients
                await db("Users").insert({ username }).onConflict("username").ignore();
                ws.send(JSON.stringify({ status: "Connected", username }));
                return;
            }

            if (!username || !clients.has(username)) {
                ws.send(JSON.stringify({ error: "Not Connected!" }));
                return;
            }

            // Private Message
            if (data.to && data.message) {
                const receiverExists = await db("Users").where({ username: data.to }).first();
                if (receiverExists) {
                    await db("Messages").insert({ sender: username, receiver: data.to, message: data.message, timestamp: db.raw("CURRENT_TIMESTAMP") });
                    ws.send(JSON.stringify({ from: username, message: data.message }));
                } else {
                    ws.send(JSON.stringify({ message: `User ${data.to} does not exist!` }));
                }
            }

            // Create Group
            if (data.createGroup) {
                await db("Groups").insert({ group_name: data.createGroup }).onConflict("group_name").ignore();
                ws.send(JSON.stringify({ message: `Group ${data.createGroup} created` }));
            }

            // Join Group
            if (data.joinGroup) {
                const groupExists = await db("Groups").where({ group_name: data.joinGroup }).first();
                if (groupExists) {
                    await db("Group_Members").insert({ group_name: data.joinGroup, username }).onConflict(["group_name", "username"]).ignore();
                    ws.send(JSON.stringify({ message: `You joined group ${data.joinGroup}` }));
                } else {
                    ws.send(JSON.stringify({ message: `Group ${data.joinGroup} does not exist!` }));
                }
            }

            // Group Messages
            if (data.toGroup && data.message) {
                const groupMember = await db("Group_Members").where({ group_name: data.toGroup, username }).first();
                if (groupMember) {
                    await db("Messages").insert({ sender: username, group_name: data.toGroup, message: data.message, timestamp: db.raw("CURRENT_TIMESTAMP") });
                    ws.send(JSON.stringify({ from: username, message: data.message }));
                } else {
                    ws.send(JSON.stringify({ message: `You are not a member of group ${data.toGroup}` }));
                }
            }

            /* Bonus Task 2 */
            // Mark Incoming Messages as Read
            if (data.readIncomingMessages && data.from) {
                await db("Messages").where({ sender: data.from, receiver: username, read: false }).update({ read: true });
                ws.send(JSON.stringify({ message: `You marked messages from ${data.from} as read` }));
            }

            // View Read Sent Messages
            if (data.viewReadSent && data.to) {
                const readMessages = await db("Messages").where({ sender: username, receiver: data.to, read: true }).select("message");
                ws.send(JSON.stringify({ "Read Messages": readMessages }));
            }
        } catch (err) {
            ws.send(JSON.stringify({ error: "Invalid message format", details: err.message }));
        }
    });

    ws.on("close", () => {
        if (username) {
            clients.delete(username);
            console.log(`User ${username} disconnected`);
        }
    });
});

// REST APIs
app.use("/messages", messagesRouter);

app.get("/users", async (req, res) => {
    try {
        const users = await db("Users").select("username");
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

app.get("/groups", async (req, res) => {
    try {
        const groups = await db("Groups").select("group_name");
        res.json({ groups });
    } catch (err) {
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

//Run Server
app.listen(3000, () => console.log("Server running on port 3000"));