import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Check if admin already exists
  const existing = await knex('users').where({ email: 'admin@fintracker.com' }).first();
  if (existing) return;

  const hashedPassword = await bcrypt.hash('admin123', 12);

  await knex('users').insert({
    email: 'admin@fintracker.com',
    password: hashedPassword,
    name: 'Admin',
    role: 'admin',
    monthly_income: 0,
    savings_percent: 25,
    investment_percent: 75,
    investment_destination: 'CEDEARs IOL',
  });
}
