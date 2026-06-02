import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('news_cache', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('cache_key').notNullable().unique();
    table.jsonb('data').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);

    table.index(['cache_key']);
    table.index(['expires_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('news_cache');
}
