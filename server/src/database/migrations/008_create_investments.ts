import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('investments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('amount', 14, 2).notNullable();
    table.date('date').notNullable();
    table.string('description'); // optional, e.g. "Compra AAPL CEDEAR"
    table.string('ticker'); // optional, e.g. "AAPL", "GOOGL" - for future API integration
    table.decimal('quantity', 14, 6); // optional, units bought
    table.decimal('price_per_unit', 14, 4); // optional
    table.string('platform'); // e.g. "IOL", "Bull Market", "Cocos"
    table.timestamps(true, true);

    table.index(['user_id', 'date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('investments');
}
