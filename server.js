import express from "express"
import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'
import knex from 'knex'
import knexConfig from './knexfile.js'
import { router as messagesRouter } from './routers/messagesRoutes.js'

dotenv.config()

const app = express()
const db = knex(knexConfig)
const wss = new WebSocketServer({ port: 8080 })
const clients = new Map()

wss.on('connection', (ws) => {
    let username = null
    if (!username) {
        ws.on('message', async (message) => {
            const data = JSON.parse(message)
            //Check Connection
            if (data.username) {
                username = data.username
                await db("Users").insert({ username: username }).onConflict("username").ignore()
                ws.send(JSON.stringify({ status: "Connected", username }))
            }

            if (!username /*|| !clients.has(username)*/) {
                ws.send(JSON.stringify({ error: "Not Connected !" }))
                return
            }
        })
    }

    ws.on('message', async (message) => {
        const data = JSON.parse(message)
        console.log(username)
        try {
            //Private Message
            if (data.to && data.message && username) {
                const receiverExists = await db("Users").where({ username: data.to }).first();
                if (receiverExists) {
                    await db("Messages").insert({ sender: username, receiver: data.to, message: data.message, timestamp: db.raw('CURRENT_TIMESTAMP') })
                    ws.send(JSON.stringify({ from: username, message: data.message }))
                } else {
                    ws.send(JSON.stringify({ message: `username ${data.to} Not Created !` }))
                }
            }

            //Create Group
            if (data.createGroup && username) {
                await db("Groups").insert({ group_name: data.createGroup }).onConflict("group_name").ignore()
                ws.send(JSON.stringify({ message: `Group ${data.createGroup} created` }))
            }

            //Join Group
            if (data.joinGroup && username) {
                const groupExists = await db("Groups").where({ group_name: data.joinGroup }).first()
                if (groupExists) {
                    await db("Group_Members").insert({ group_name: data.joinGroup, username: username }).onConflict(['group_name', 'username']).ignore()
                    ws.send(JSON.stringify({ message: `You joined group ${data.joinGroup}` }))
                } else {
                    ws.send(JSON.stringify({ message: `Group ${data.joinGroup} Not created` }))
                }
            }

            //Group Messages
            if (data.toGroup && data.message && username) {
                const groupExists = await db("Group_Members").where({ group_name: data.toGroup, username: username }).first()
                if (groupExists) {
                    await db("Messages").insert({ sender: username, group_name: data.toGroup, message: data.message, timestamp: db.raw('CURRENT_TIMESTAMP') })
                    ws.send(JSON.stringify({ from: username, message: data.message }))
                } else {
                    ws.send(JSON.stringify({ message: `You are not member in group ${data.toGroup}` }))
                }
            }
        } catch (err) {
            ws.send(JSON.stringify({ message: err }))
        }
    })

    ws.on('close', () => {
        if (username) {
            ws.send(JSON.stringify({ message: `user ${username} disconnected!` }))
            clients.delete(username)
            username = null
        }
    })
})


app.use('/messages', messagesRouter)

app.get('/users', async (req, res) => {
    try {
        const users = await db("Users").select("username")
        res.json({ users })
    } catch (err) {
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

app.get('/groups', async (req, res) => {
    try {
        const groups = await db("Groups").select("group_name")
        res.json({ groups })
    } catch (err) {
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

app.listen(3000, () => console.log('server on port 3000'));