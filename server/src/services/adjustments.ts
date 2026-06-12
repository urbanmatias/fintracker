import db from '../database/connection';

export async function getExcedentDelta(userId: string): Promise<number> {
  const row = await db('manual_adjustments')
    .where({ user_id: userId, type: 'excedent' })
    .sum('delta as total')
    .first();
  return Number(row?.total || 0);
}

export async function getMonthRemainingDelta(
  userId: string,
  year: number,
  month: number
): Promise<number> {
  const row = await db('manual_adjustments')
    .where({ user_id: userId, type: 'month_remaining' })
    .whereRaw('EXTRACT(MONTH FROM applied_date) = ? AND EXTRACT(YEAR FROM applied_date) = ?', [month, year])
    .sum('delta as total')
    .first();
  return Number(row?.total || 0);
}
