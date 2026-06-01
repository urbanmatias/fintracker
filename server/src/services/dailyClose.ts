import db from '../database/connection';

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

  // Find the first day with any activity (expense or registration)
  let startDate: string;

  if (lastClosed) {
    const next = new Date(lastClosed.date);
    next.setUTCDate(next.getUTCDate() + 1);
    startDate = next.toISOString().split('T')[0];
  } else {
    // Use first expense day or user creation day, whichever is later
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

  const savingsPercent = Number(user.savings_percent) / 100;
  const investmentPercent = Number(user.investment_percent) / 100;

  // Get current excedent balance
  let excedentBalance = lastClosed ? Number(lastClosed.excedent_balance) : 0;

  let closedCount = 0;
  const cursor = new Date(startDate);
  const endCursor = new Date(today); // exclusive: don't close today

  while (cursor < endCursor) {
    const dateStr = cursor.toISOString().split('T')[0];

    // Calculate budget for that day (based on current month)
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const fixedExpenses = await db('fixed_expenses')
      .where({ user_id: userId, active: true })
      .sum('amount as total')
      .first();

    const dailyBudget =
      (Number(user.monthly_income) - Number(fixedExpenses?.total || 0)) / daysInMonth;

    // Sum that day's expenses
    const dayExpenses = await db('daily_expenses')
      .where({ user_id: userId, date: dateStr });
    const totalSpent = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const surplus = dailyBudget - totalSpent;
    const overBudget = surplus < 0;

    let toInvestment = 0;
    let toExcedent = 0;
    let fromExcedent = 0;

    if (overBudget) {
      // Spent more than budget, full overspend comes from excedent (can go negative)
      fromExcedent = Math.abs(surplus);
    } else {
      toInvestment = surplus * investmentPercent;
      toExcedent = surplus * savingsPercent;
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
      })
      .onConflict(['user_id', 'date'])
      .merge();

    closedCount++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return closedCount;
}
