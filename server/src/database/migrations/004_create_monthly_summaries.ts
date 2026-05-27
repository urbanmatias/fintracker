import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('monthly_summaries', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('year').notNullable();
    table.integer('month').notNullable(); // 1-12
    table.decimal('income', 12, 2).notNullable();
    table.decimal('total_fixed_expenses', 12, 2).notNullable();
    table.decimal('total_daily_expenses', 12, 2).notNullable();
    table.decimal('daily_budget', 12, 2).notNullable();
    table.decimal('total_saved', 12, 2).defaultTo(0); // lo que quedó en cuenta
    table.decimal('total_invested', 12, 2).defaultTo(0); // lo que fue a inversión
    table.timestamps(true, true);

    table.unique(['user_id', 'year', 'month']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('monthly_summaries');
}
