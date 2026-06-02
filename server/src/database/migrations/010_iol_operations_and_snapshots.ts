import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // IOL operations history
  await knex.schema.createTable('iol_operations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.bigInteger('iol_operation_id').notNullable();
    table.date('date').notNullable();
    table.string('type'); // Compra, Venta, etc
    table.string('status');
    table.string('symbol');
    table.string('market');
    table.decimal('quantity', 18, 6);
    table.decimal('price', 14, 4);
    table.decimal('total', 14, 2);
    table.string('currency');
    table.jsonb('raw_data');
    table.uuid('matched_investment_id').references('id').inTable('investments').onDelete('SET NULL');
    table.timestamps(true, true);

    table.unique(['user_id', 'iol_operation_id']);
    table.index(['user_id', 'date']);
  });

  // Daily portfolio snapshots for patrimony chart
  await knex.schema.createTable('portfolio_snapshots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('date').notNullable();
    table.decimal('total_valuation', 16, 2);
    table.decimal('total_profit_loss', 16, 2);
    table.integer('positions_count').defaultTo(0);
    table.jsonb('raw_positions');
    table.timestamps(true, true);

    table.unique(['user_id', 'date']);
  });

  // Mark investments that came from IOL operations
  await knex.schema.alterTable('investments', (table) => {
    table.bigInteger('iol_operation_id').nullable();
    table.boolean('auto_generated').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('investments', (table) => {
    table.dropColumn('auto_generated');
    table.dropColumn('iol_operation_id');
  });
  await knex.schema.dropTableIfExists('portfolio_snapshots');
  await knex.schema.dropTableIfExists('iol_operations');
}
