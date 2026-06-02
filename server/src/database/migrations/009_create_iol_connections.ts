import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('iol_connections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.text('username_encrypted').notNullable();
    table.text('password_encrypted').notNullable();
    table.text('access_token'); // current bearer token
    table.timestamp('token_expires_at');
    table.text('refresh_token');
    table.timestamp('last_sync_at');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('iol_portfolio', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('country').notNullable(); // argentina / estados_unidos
    table.string('symbol').notNullable();
    table.string('description');
    table.string('instrument_type'); // CEDEAR, ACCIONES, etc.
    table.decimal('quantity', 18, 6).notNullable();
    table.decimal('last_price', 14, 4);
    table.decimal('ppc', 14, 4); // precio promedio compra
    table.decimal('valuation', 14, 2); // valor en moneda local
    table.decimal('profit_loss', 14, 2);
    table.decimal('profit_loss_percent', 10, 4);
    table.string('currency'); // peso_Argentino, dolar_estadounidense
    table.timestamp('updated_at_iol');
    table.timestamps(true, true);

    table.unique(['user_id', 'country', 'symbol']);
    table.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('iol_portfolio');
  await knex.schema.dropTableIfExists('iol_connections');
}
