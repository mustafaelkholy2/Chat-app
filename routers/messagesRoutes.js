import express from 'express'
import knex from 'knex'
import knexConfig from '../knexfile.js'

const db = knex(knexConfig)

const router = express.Router()

router.get('/private/:username', async (req, res) => {
    const username = req.params.username
    try {
        const messages = await db("Messages").where(function () {
            this.where("receiver", username).orWhere("sender", username);
        }).whereNotNull("receiver").orderBy("timestamp", "desc").limit(20)
        res.json({ messages })
    } catch (err) {
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

router.get('/group/:groupName', async (req, res) => {
    const group_name = req.params.groupName
    try {
        const messages = await db("Messages").where("group_name", group_name).orderBy("timestamp", "desc").limit(20)
        res.json({ messages })
    } catch (err) {
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

export { router }