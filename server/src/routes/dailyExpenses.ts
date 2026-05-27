import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';

const router = Router();

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

// Get today's summary
router.get('/today', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const expenses = await db('daily_expenses')
      .where({ user_id: req.user!.id, date: today });

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Get user's daily budget
    const user = await db('users').where({ id: req.user!.id }).first();
    const fixedExpenses = await db('fixed_expenses')
      .where({ user_id: req.user!.id, active: true })
      .sum('amount as total')
      .first();

    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();

    const dailyBudget = (Number(user.monthly_income) - Number(fixedExpenses?.total || 0)) / daysInMonth;
    const remaining = dailyBudget - totalSpent;
    const saved = remaining > 0 ? remaining : 0;

    res.json({
      date: today,
      daily_budget: dailyBudget,
      total_spent: totalSpent,
      remaining,
      to_savings: saved * (Number(user.savings_percent) / 100),
      to_investment: saved * (Number(user.investment_percent) / 100),
      expenses,
    });
  } catch (error) {
    console.error('Get today summary error:', error);
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
