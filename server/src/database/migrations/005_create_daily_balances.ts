import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('daily_balances', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('date').notNullable();
    table.decimal('budget', 12, 2).notNullable(); // presupuesto del día
    table.decimal('spent', 12, 2).defaultTo(0); // total gastado ese día
    table.decimal('surplus', 12, 2).defaultTo(0); // lo que sobró (positivo) o faltó (negativo)
    table.decimal('to_investment', 12, 2).defaultTo(0); // parte que va a inversión
    table.decimal('to_excedent', 12, 2).defaultTo(0); // parte que va al colchón
    table.decimal('from_excedent', 12, 2).defaultTo(0); // lo que se sacó del colchón (si se pasó)
    table.decimal('excedent_balance', 12, 2).defaultTo(0); // excedente acumulado al cierre del día
    table.timestamps(true, true);

    table.unique(['user_id', 'date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('daily_balances');
}
