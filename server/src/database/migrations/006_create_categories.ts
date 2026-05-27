import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.enum('type', ['daily', 'fixed']).notNullable();
    table.string('color').defaultTo('#9BA9B4');
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);

    table.unique(['user_id', 'name', 'type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('categories');
}
