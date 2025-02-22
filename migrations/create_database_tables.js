/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema
        .createTable('Users', (table) => {
            table.increments('id').primary()
            table.string('username').notNullable().unique()
        })
        .createTable('Groups', (table) => {
            table.increments('id').primary()
            table.string('group_name').notNullable().unique()
        })
        .createTable('Group_Members', (table) => {
            table.increments('id').primary()
            table.string('group_name').notNullable()
            table.string('username').notNullable()

            table.foreign('group_name').references('Groups.group_name')
            table.foreign('username').references('Users.username')

            table.unique(['group_name', 'username'])
        })
        .createTable('Messages', (table) => {
            table.increments('id').primary()
            table.string('sender').notNullable()
            table.string('receiver').nullable()
            table.string('group_name').nullable()
            table.text('message').notNullable()
            table.dateTime('timestamp').defaultTo(knex.fn.now())

            //Bonus
            table.boolean('read').defaultTo(false)
            table.foreign('sender').references('Users.username')
        })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema
        .dropTable('Messages')
        .dropTable('Group_Members')
        .dropTable('Users')
        .dropTable('Groups')
};