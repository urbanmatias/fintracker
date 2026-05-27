import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';

const router = Router();

// Get monthly summary
router.get('/monthly/:year/:month', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.params;

    const user = await db('users').where({ id: req.user!.id }).first();

    // Fixed expenses total
    const fixedExpenses = await db('fixed_expenses')
      .where({ user_id: req.user!.id, active: true })
      .sum('amount as total')
      .first();

    // Daily expenses for the month
    const dailyExpenses = await db('daily_expenses')
      .where({ user_id: req.user!.id })
      .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [month, year]);

    const totalDailyExpenses = dailyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // By category
    const byCategory = await db('daily_expenses')
      .where({ user_id: req.user!.id })
      .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [month, year])
      .groupBy('category')
      .select('category')
      .sum('amount as total')
      .count('* as count');

    // Days in month
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
    const dailyBudget = (Number(user.monthly_income) - Number(fixedExpenses?.total || 0)) / daysInMonth;

    // Daily breakdown
    const dailyBreakdown = await db('daily_expenses')
      .where({ user_id: req.user!.id })
      .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [month, year])
      .groupBy('date')
      .select('date')
      .sum('amount as total')
      .orderBy('date');

    const totalAvailable = Number(user.monthly_income) - Number(fixedExpenses?.total || 0);
    const totalSaved = totalAvailable - totalDailyExpenses;

    res.json({
      year: Number(year),
      month: Number(month),
      income: Number(user.monthly_income),
      total_fixed_expenses: Number(fixedExpenses?.total || 0),
      total_daily_expenses: totalDailyExpenses,
      daily_budget: dailyBudget,
      total_available: totalAvailable,
      total_saved: totalSaved > 0 ? totalSaved : 0,
      to_savings: totalSaved > 0 ? totalSaved * (Number(user.savings_percent) / 100) : 0,
      to_investment: totalSaved > 0 ? totalSaved * (Number(user.investment_percent) / 100) : 0,
      by_category: byCategory,
      daily_breakdown: dailyBreakdown,
      days_in_month: daysInMonth,
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get yearly overview
router.get('/yearly/:year', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.params;

    const monthlySummaries = [];

    for (let month = 1; month <= 12; month++) {
      const dailyExpenses = await db('daily_expenses')
        .where({ user_id: req.user!.id })
        .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [month, year])
        .sum('amount as total')
        .first();

      monthlySummaries.push({
        month,
        total_expenses: Number(dailyExpenses?.total || 0),
      });
    }

    res.json({ year: Number(year), months: monthlySummaries });
  } catch (error) {
    console.error('Get yearly stats error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
