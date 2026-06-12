import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('manual_adjustments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['excedent', 'month_remaining']).notNullable();
    table.decimal('delta', 14, 2).notNullable(); // signed offset applied forever (or for the month)
    table.decimal('previous_value', 14, 2); // for audit only
    table.decimal('target_value', 14, 2); // for audit only
    table.string('description');
    table.date('applied_date').notNullable(); // for month_remaining filtering
    table.timestamps(true, true);
    table.index(['user_id', 'type']);
    table.index(['user_id', 'applied_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('manual_adjustments');
}
