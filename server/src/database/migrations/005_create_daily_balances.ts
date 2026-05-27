import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('daily_balances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('date').notNullable();
    table.decimal('budget', 12, 2).notNullable();
    table.decimal('spent', 12, 2).defaultTo(0);
    table.decimal('surplus', 12, 2).defaultTo(0);
    table.decimal('to_investment', 12, 2).defaultTo(0);
    table.decimal('to_excedent', 12, 2).defaultTo(0);
    table.decimal('from_excedent', 12, 2).defaultTo(0);
    table.decimal('excedent_balance', 12, 2).defaultTo(0);
    table.timestamps(true, true);

    table.unique(['user_id', 'date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('daily_balances');
}
