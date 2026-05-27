import db from '../database/connection';

const DEFAULT_DAILY = [
  { name: 'Comida', color: '#FBBF24' },
  { name: 'Bar/Alcohol', color: '#A78BFA' },
  { name: 'Transporte', color: '#4ADEDE' },
  { name: 'Entretenimiento', color: '#F472B6' },
  { name: 'Salud', color: '#FF5D73' },
  { name: 'Educación', color: '#34D399' },
  { name: 'Ropa', color: '#818CF8' },
  { name: 'Hogar', color: '#19C37D' },
  { name: 'Otros', color: '#9BA9B4' },
];

const DEFAULT_FIXED = [
  { name: 'Alquiler', color: '#19C37D' },
  { name: 'Servicios', color: '#4ADEDE' },
  { name: 'Suscripciones', color: '#A78BFA' },
  { name: 'Seguros', color: '#FBBF24' },
  { name: 'Transporte', color: '#34D399' },
  { name: 'Otros', color: '#9BA9B4' },
];

export async function ensureDefaultCategories(userId: string): Promise<void> {
  const existing = await db('categories').where({ user_id: userId }).count('* as count').first();
  if (Number(existing?.count || 0) > 0) return;

  const dailyRows = DEFAULT_DAILY.map((c, i) => ({
    user_id: userId,
    name: c.name,
    type: 'daily' as const,
    color: c.color,
    sort_order: i,
  }));
  const fixedRows = DEFAULT_FIXED.map((c, i) => ({
    user_id: userId,
    name: c.name,
    type: 'fixed' as const,
    color: c.color,
    sort_order: i,
  }));

  await db('categories').insert([...dailyRows, ...fixedRows]);
}
