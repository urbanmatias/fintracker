import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add tags column to daily_expenses (text array)
  await knex.schema.alterTable('daily_expenses', (table) => {
    table.specificType('tags', 'text[]').defaultTo(knex.raw("'{}'::text[]"));
  });

  // Recurring expenses (manual non-fixed, e.g. monthly gym paid in cash)
  await knex.schema.createTable('recurring_expenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.string('category').notNullable();
    table.integer('day_of_month').notNullable(); // 1-31
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('recurring_expenses');
  await knex.schema.alterTable('daily_expenses', (table) => {
    table.dropColumn('tags');
  });
}
