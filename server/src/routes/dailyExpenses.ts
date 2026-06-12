import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';
import { autoCloseDays } from '../services/dailyClose';
import { getExcedentDelta, getMonthRemainingDelta } from '../services/adjustments';

const router = Router();

// Helper: get the current excedent balance for a user (sum of all past days)
async function getExcedentBalance(userId: string, beforeDate: string): Promise<number> {
  const result = await db('daily_balances')
    .where({ user_id: userId })
    .where('date', '<', beforeDate)
    .orderBy('date', 'desc')
    .first();

  const baseValue = result ? Number(result.excedent_balance) : 0;
  const adjustment = await getExcedentDelta(userId);
  return baseValue + adjustment;
}

// Helper: get daily budget for a user
async function getDailyBudget(userId: string): Promise<number> {
  const user = await db('users').where({ id: userId }).first();
  if (!user) return 0;

  const fixedExpenses = await db('fixed_expenses')
    .where({ user_id: userId, active: true })
    .sum('amount as total')
    .first();

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();

  const income = Number(user.monthly_income || 0);
  const fixed = Number(fixedExpenses?.total || 0);

  if (income <= 0 || daysInMonth <= 0) return 0;

  const budget = (income - fixed) / daysInMonth;
  return Number.isFinite(budget) ? budget : 0;
}

// Get daily expenses (with optional date filters)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, category, month, year } = req.query;

    let query = db('daily_expenses').where({ user_id: req.user!.id });

    if (start_date) query = query.where('date', '>=', String(start_date));
    if (end_date) query = query.where('date', '<=', String(end_date));
    if (category) query = query.where({ category: String(category) });

    // Filter by month/year
    if (month && year) {
      query = query.whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [String(month), String(year)]);
    } else if (year) {
      query = query.whereRaw('EXTRACT(YEAR FROM date) = ?', [String(year)]);
    }

    const expenses = await query.orderBy('date', 'desc');
    res.json(expenses);
  } catch (error) {
    console.error('Get daily expenses error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get today's summary with excedent info
router.get('/today', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Auto-close any past days first
    await autoCloseDays(req.user!.id);

    const today = new Date().toISOString().split('T')[0];

    const expenses = await db('daily_expenses')
      .where({ user_id: req.user!.id, date: today });

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const user = await db('users').where({ id: req.user!.id }).first();
    const dailyBudget = await getDailyBudget(req.user!.id);
    const excedentBalance = await getExcedentBalance(req.user!.id, today);

    // Month-level info
    const todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = todayDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    const fixedExpensesRow = await db('fixed_expenses')
      .where({ user_id: req.user!.id, active: true })
      .sum('amount as total')
      .first();
    const fixedTotal = Number(fixedExpensesRow?.total || 0);
    const monthBudget = Math.max(0, Number(user?.monthly_income || 0) - fixedTotal);

    const monthSpentRow = await db('daily_expenses')
      .where({ user_id: req.user!.id })
      .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [month, year])
      .sum('amount as total')
      .first();
    const monthSpent = Number(monthSpentRow?.total || 0);
    const monthRemainingDelta = await getMonthRemainingDelta(req.user!.id, year, month);
    const monthRemaining = monthBudget - monthSpent + monthRemainingDelta;

    const remaining = dailyBudget - totalSpent;
    const overBudget = remaining < 0;
    const overAmount = overBudget ? Math.abs(remaining) : 0;
    const savedToday = remaining > 0 ? remaining : 0;

    // Load distribution buckets
    const buckets = await db('distribution_buckets')
      .where({ user_id: req.user!.id })
      .orderBy('sort_order');

    // Distribute savedToday across all buckets
    const bucketsBreakdown = buckets.map((b) => ({
      bucket_id: b.id,
      name: b.name,
      type: b.type,
      color: b.color,
      percent: Number(b.percent),
      description: b.description,
      amount: savedToday * (Number(b.percent) / 100),
    }));

    // Aggregate per type for backwards compatibility
    const toInvestment = bucketsBreakdown
      .filter((b) => b.type === 'investment')
      .reduce((s, b) => s + b.amount, 0);
    const toExcedent = bucketsBreakdown
      .filter((b) => b.type === 'excedent')
      .reduce((s, b) => s + b.amount, 0);

    // If over budget, full overspend comes from excedent (can go negative)
    const fromExcedent = overBudget ? overAmount : 0;
    const currentExcedent = excedentBalance + toExcedent - fromExcedent;

    const effectiveAvailable = dailyBudget + excedentBalance;

    // Legacy investment_destination = first investment bucket description
    const investmentDestination =
      bucketsBreakdown.find((b) => b.type === 'investment')?.description || user?.investment_destination || '';

    // Legacy percentages
    const investmentPercent = Number(user?.investment_percent || 0);
    const savingsPercent = Number(user?.savings_percent || 0);

    res.json({
      date: today,
      daily_budget: dailyBudget,
      total_spent: totalSpent,
      remaining,
      over_budget: overBudget,
      over_amount: overAmount,
      to_investment: toInvestment,
      to_excedent: toExcedent,
      from_excedent: fromExcedent,
      excedent_balance: excedentBalance,
      excedent_after_today: currentExcedent,
      effective_available: effectiveAvailable,
      savings_percent: savingsPercent,
      investment_percent: investmentPercent,
      investment_destination: investmentDestination,
      buckets_breakdown: bucketsBreakdown,
      month_budget: monthBudget,
      month_spent: monthSpent,
      month_remaining: monthRemaining,
      days_in_month: daysInMonth,
      day_of_month: todayDate.getDate(),
      expenses,
    });
  } catch (error) {
    console.error('Get today summary error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Close a day (calculate and store the balance) - can be called manually or via cron
router.post('/close-day', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const user = await db('users').where({ id: req.user!.id }).first();
    const dailyBudget = await getDailyBudget(req.user!.id);
    const excedentBalance = await getExcedentBalance(req.user!.id, targetDate);

    const expenses = await db('daily_expenses')
      .where({ user_id: req.user!.id, date: targetDate });
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const surplus = dailyBudget - totalSpent;
    const overBudget = surplus < 0;

    const savingsPercent = Number(user.savings_percent) / 100;
    const investmentPercent = Number(user.investment_percent) / 100;

    let toInvestment = 0;
    let toExcedent = 0;
    let fromExcedent = 0;

    if (overBudget) {
      // Spent more than budget, full overspend comes from excedent (can go negative)
      fromExcedent = Math.abs(surplus);
    } else {
      // Saved money, distribute
      toInvestment = surplus * investmentPercent;
      toExcedent = surplus * savingsPercent;
    }

    const newExcedentBalance = excedentBalance + toExcedent - fromExcedent;

    // Upsert the daily balance
    await db('daily_balances')
      .insert({
        user_id: req.user!.id,
        date: targetDate,
        budget: dailyBudget,
        spent: totalSpent,
        surplus,
        to_investment: toInvestment,
        to_excedent: toExcedent,
        from_excedent: fromExcedent,
        excedent_balance: newExcedentBalance,
      })
      .onConflict(['user_id', 'date'])
      .merge();

    res.json({
      date: targetDate,
      budget: dailyBudget,
      spent: totalSpent,
      surplus,
      to_investment: toInvestment,
      to_excedent: toExcedent,
      from_excedent: fromExcedent,
      excedent_balance: newExcedentBalance,
    });
  } catch (error) {
    console.error('Close day error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create daily expense
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, description, category, date, tags } = req.body;

    if (!amount || !description || !category) {
      res.status(400).json({ error: 'Monto, descripción y categoría son requeridos' });
      return;
    }

    const expenseDate = date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const [expense] = await db('daily_expenses')
      .insert({
        user_id: req.user!.id,
        amount,
        description,
        category,
        date: expenseDate,
        tags: Array.isArray(tags) ? tags : [],
      })
      .returning('*');

    if (expenseDate < today) {
      await db('daily_balances')
        .where({ user_id: req.user!.id })
        .where('date', '>=', expenseDate)
        .del();
      await autoCloseDays(req.user!.id);
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create daily expense error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get a specific day's details (expenses + balance)
router.get('/day/:date', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await autoCloseDays(req.user!.id);

    const { date } = req.params;

    const expenses = await db('daily_expenses')
      .where({ user_id: req.user!.id, date })
      .orderBy('created_at', 'desc');

    const balance = await db('daily_balances')
      .where({ user_id: req.user!.id, date })
      .first();

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const dailyBudget = await getDailyBudget(req.user!.id);

    res.json({
      date,
      expenses,
      balance: balance || null,
      total_spent: totalSpent,
      daily_budget: dailyBudget,
    });
  } catch (error) {
    console.error('Get day details error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update a daily expense
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, description, category, date, tags } = req.body;

    const existing = await db('daily_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .first();

    if (!existing) {
      res.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }

    const [updated] = await db('daily_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .update({
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(date !== undefined && { date }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
        updated_at: new Date(),
      })
      .returning('*');

    const earliestDate = date && date < existing.date ? date : existing.date;
    await db('daily_balances')
      .where({ user_id: req.user!.id })
      .where('date', '>=', earliestDate)
      .del();

    await autoCloseDays(req.user!.id);

    res.json(updated);
  } catch (error) {
    console.error('Update daily expense error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete daily expense
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await db('daily_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .first();

    if (!existing) {
      res.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }

    await db('daily_expenses').where({ id: req.params.id }).del();

    // Invalidate balances from the affected date onwards
    await db('daily_balances')
      .where({ user_id: req.user!.id })
      .where('date', '>=', existing.date)
      .del();

    await autoCloseDays(req.user!.id);

    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    console.error('Delete daily expense error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
