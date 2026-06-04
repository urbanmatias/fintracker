import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('daily_balances', (table) => {
    // JSONB array: [{ bucket_id, name, type, color, percent, amount }, ...]
    table.jsonb('buckets_breakdown').defaultTo('[]');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('daily_balances', (table) => {
    table.dropColumn('buckets_breakdown');
  });
}
