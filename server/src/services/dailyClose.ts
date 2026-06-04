import db from '../database/connection';

interface BucketRow {
  id: string;
  name: string;
  type: 'investment' | 'excedent' | 'custom';
  color: string;
  percent: number;
  description: string | null;
}

interface BucketBreakdown {
  bucket_id: string;
  name: string;
  type: 'investment' | 'excedent' | 'custom';
  color: string;
  percent: number;
  description: string | null;
  amount: number;
}

/**
 * Auto-close all past unclosed days for a user.
 * For each day from the last closed day (or first expense day) up to yesterday,
 * calculate and store the daily balance.
 */
export async function autoCloseDays(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const user = await db('users').where({ id: userId }).first();
  if (!user || !user.monthly_income || Number(user.monthly_income) === 0) return 0;

  // Find the last closed day
  const lastClosed = await db('daily_balances')
    .where({ user_id: userId })
    .orderBy('date', 'desc')
    .first();

  let startDate: string;

  if (lastClosed) {
    const next = new Date(lastClosed.date);
    next.setUTCDate(next.getUTCDate() + 1);
    startDate = next.toISOString().split('T')[0];
  } else {
    const firstExpense = await db('daily_expenses')
      .where({ user_id: userId })
      .orderBy('date', 'asc')
      .first();

    const userCreated = new Date(user.created_at).toISOString().split('T')[0];
    startDate = firstExpense
      ? (firstExpense.date < userCreated ? userCreated : firstExpense.date)
      : userCreated;
  }

  if (startDate >= today) return 0;

  // Load distribution buckets once
  const bucketsRaw = await db('distribution_buckets')
    .where({ user_id: userId })
    .orderBy('sort_order');
  const buckets: BucketRow[] = bucketsRaw.map((b) => ({
    id: b.id,
    name: b.name,
    type: b.type,
    color: b.color,
    percent: Number(b.percent),
    description: b.description,
  }));

  // Get current excedent balance from last close (or 0)
  let excedentBalance = lastClosed ? Number(lastClosed.excedent_balance) : 0;

  let closedCount = 0;
  const cursor = new Date(startDate);
  const endCursor = new Date(today);

  while (cursor < endCursor) {
    const dateStr = cursor.toISOString().split('T')[0];

    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const fixedExpenses = await db('fixed_expenses')
      .where({ user_id: userId, active: true })
      .sum('amount as total')
      .first();

    const dailyBudget =
      (Number(user.monthly_income) - Number(fixedExpenses?.total || 0)) / daysInMonth;

    const dayExpenses = await db('daily_expenses')
      .where({ user_id: userId, date: dateStr });
    const totalSpent = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const surplus = dailyBudget - totalSpent;
    const overBudget = surplus < 0;

    let breakdown: BucketBreakdown[] = [];
    let toInvestment = 0;
    let toExcedent = 0;
    let fromExcedent = 0;

    if (overBudget) {
      fromExcedent = Math.abs(surplus);
    } else {
      breakdown = buckets.map((b) => ({
        bucket_id: b.id,
        name: b.name,
        type: b.type,
        color: b.color,
        percent: b.percent,
        description: b.description,
        amount: surplus * (b.percent / 100),
      }));
      toInvestment = breakdown.filter((b) => b.type === 'investment').reduce((s, b) => s + b.amount, 0);
      toExcedent = breakdown.filter((b) => b.type === 'excedent').reduce((s, b) => s + b.amount, 0);
    }

    excedentBalance = excedentBalance + toExcedent - fromExcedent;

    await db('daily_balances')
      .insert({
        user_id: userId,
        date: dateStr,
        budget: dailyBudget,
        spent: totalSpent,
        surplus,
        to_investment: toInvestment,
        to_excedent: toExcedent,
        from_excedent: fromExcedent,
        excedent_balance: excedentBalance,
        buckets_breakdown: JSON.stringify(breakdown),
      })
      .onConflict(['user_id', 'date'])
      .merge();

    closedCount++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return closedCount;
}
