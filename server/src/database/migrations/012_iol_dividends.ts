import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('iol_dividends', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.bigInteger('iol_movement_id').notNullable();
    table.date('date').notNullable();
    table.string('symbol');
    table.string('type'); // "Pago de Dividendos", "Renta", "Cobro de Dividendos", etc.
    table.decimal('amount', 14, 2).notNullable();
    table.string('currency');
    table.string('description');
    table.jsonb('raw_data');
    table.timestamps(true, true);

    table.unique(['user_id', 'iol_movement_id']);
    table.index(['user_id', 'date']);
    table.index(['user_id', 'symbol']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('iol_dividends');
}
