import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';

const router = Router();

// Helper: get the current excedent balance for a user (sum of all past days)
async function getExcedentBalance(userId: string, beforeDate: string): Promise<number> {
  const result = await db('daily_balances')
    .where({ user_id: userId })
    .where('date', '<', beforeDate)
    .orderBy('date', 'desc')
    .first();

  return result ? Number(result.excedent_balance) : 0;
}

// Helper: get daily budget for a user
async function getDailyBudget(userId: string): Promise<number> {
  const user = await db('users').where({ id: userId }).first();
  const fixedExpenses = await db('fixed_expenses')
    .where({ user_id: userId, active: true })
    .sum('amount as total')
    .first();

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();

  return (Number(user.monthly_income) - Number(fixedExpenses?.total || 0)) / daysInMonth;
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
    const today = new Date().toISOString().split('T')[0];

    const expenses = await db('daily_expenses')
      .where({ user_id: req.user!.id, date: today });

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const user = await db('users').where({ id: req.user!.id }).first();
    const dailyBudget = await getDailyBudget(req.user!.id);
    const excedentBalance = await getExcedentBalance(req.user!.id, today);

    const remaining = dailyBudget - totalSpent;
    const overBudget = remaining < 0;
    const overAmount = overBudget ? Math.abs(remaining) : 0;
    const savedToday = remaining > 0 ? remaining : 0;

    // Distribution of savings
    const savingsPercent = Number(user.savings_percent) / 100; // goes to excedent
    const investmentPercent = Number(user.investment_percent) / 100; // goes to investment

    const toExcedent = savedToday * savingsPercent;
    const toInvestment = savedToday * investmentPercent;

    // If over budget, how much comes from excedent
    const fromExcedent = overBudget ? Math.min(overAmount, excedentBalance) : 0;
    const currentExcedent = excedentBalance + toExcedent - fromExcedent;

    // Effective available = daily budget + excedent balance (what you can actually spend)
    const effectiveAvailable = dailyBudget + excedentBalance;

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
      savings_percent: Number(user.savings_percent),
      investment_percent: Number(user.investment_percent),
      investment_destination: user.investment_destination,
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
      // Spent more than budget, take from excedent
      fromExcedent = Math.min(Math.abs(surplus), excedentBalance);
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
    const { amount, description, category, date } = req.body;

    if (!amount || !description || !category) {
      res.status(400).json({ error: 'Monto, descripción y categoría son requeridos' });
      return;
    }

    const [expense] = await db('daily_expenses')
      .insert({
        user_id: req.user!.id,
        amount,
        description,
        category,
        date: date || new Date().toISOString().split('T')[0],
      })
      .returning('*');

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create daily expense error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete daily expense
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await db('daily_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .del();

    if (!deleted) {
      res.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }

    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    console.error('Delete daily expense error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
