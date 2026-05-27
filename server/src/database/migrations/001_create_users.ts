import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('name').notNullable();
    table.enum('role', ['user', 'admin']).defaultTo('user').notNullable();
    table.decimal('monthly_income', 12, 2).defaultTo(0);
    table.decimal('savings_percent', 5, 2).defaultTo(25); // % que queda en cuenta
    table.decimal('investment_percent', 5, 2).defaultTo(75); // % que va a inversión
    table.string('investment_destination').defaultTo('CEDEARs IOL'); // descripción libre
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
