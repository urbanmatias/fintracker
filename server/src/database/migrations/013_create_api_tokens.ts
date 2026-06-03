import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable(); // friendly name like "Mi laptop"
    table.text('token_hash').notNullable(); // sha256 hash of the actual token
    table.string('prefix').notNullable(); // first 8 chars to display
    table.timestamp('last_used_at');
    table.timestamps(true, true);

    table.index(['user_id']);
    table.index(['token_hash']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_tokens');
}
