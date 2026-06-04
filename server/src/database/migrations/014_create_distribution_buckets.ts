import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('distribution_buckets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.decimal('percent', 5, 2).notNullable();
    table.enum('type', ['investment', 'excedent', 'custom']).defaultTo('custom').notNullable();
    table.string('color').defaultTo('#9BA9B4');
    table.integer('sort_order').defaultTo(0);
    table.string('description'); // free text, e.g. "CEDEARs en IOL", "Visa Galicia"
    table.timestamps(true, true);
    table.index(['user_id']);
  });

  // Migrate existing users: create one investment bucket and one excedent bucket from legacy columns
  const users = await knex('users').select('id', 'investment_percent', 'savings_percent', 'investment_destination');
  for (const user of users) {
    const investmentPct = Number(user.investment_percent || 0);
    const excedentPct = Number(user.savings_percent || 0);
    const rows: Record<string, unknown>[] = [];
    if (investmentPct > 0) {
      rows.push({
        user_id: user.id,
        name: 'Inversión',
        percent: investmentPct,
        type: 'investment',
        color: '#19C37D',
        sort_order: 0,
        description: user.investment_destination || null,
      });
    }
    if (excedentPct > 0) {
      rows.push({
        user_id: user.id,
        name: 'Excedente',
        percent: excedentPct,
        type: 'excedent',
        color: '#FBBF24',
        sort_order: 1,
        description: 'Colchón para días malos',
      });
    }
    if (rows.length > 0) {
      await knex('distribution_buckets').insert(rows);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('distribution_buckets');
}
