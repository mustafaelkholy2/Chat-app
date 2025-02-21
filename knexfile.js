export default {
    client: 'sqlite3',
    connection: {
        filename: './database/chat_app.db'
    },
    useNullAsDefault: true,
    migrations: {
        directory: './migrations'
    }
}