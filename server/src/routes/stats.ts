import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';
import { autoCloseDays } from '../services/dailyClose';

const router = Router();

// Get calendar heatmap for a month - shows daily balance status
router.get('/calendar/:year/:month', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await autoCloseDays(req.user!.id);

    const { year, month } = req.params;

    const balances = await db('daily_balances')
      .where({ user_id: req.user!.id })
      .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [month, year])
      .orderBy('date', 'asc');

    // Also get today's live data (not yet closed)
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = await db('daily_expenses')
      .where({ user_id: req.user!.id, date: today })
      .sum('amount as total')
      .first();

    const days = balances.map((b) => ({
      date: b.date,
      budget: Number(b.budget),
      spent: Number(b.spent),
      surplus: Number(b.surplus),
      excedent_balance: Number(b.excedent_balance),
      status: Number(b.surplus) > 0 ? 'positive' : Number(b.surplus) < 0 ? 'negative' : 'neutral',
    }));

    res.json({
      year: Number(year),
      month: Number(month),
      days,
      today: {
        date: today,
        spent: Number(todayExpenses?.total || 0),
      },
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get monthly summary
router.get('/monthly/:year/:month', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await autoCloseDays(req.user!.id);

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

    // Compute distribution across user's buckets
    const buckets = await db('distribution_buckets')
      .where({ user_id: req.user!.id })
      .orderBy('sort_order');

    const bucketsBreakdown = buckets.map((b) => {
      const percent = Number(b.percent);
      return {
        bucket_id: b.id,
        name: b.name,
        type: b.type,
        color: b.color,
        percent,
        description: b.description,
        amount: totalSaved > 0 ? totalSaved * (percent / 100) : 0,
      };
    });

    const toInvestmentTotal = bucketsBreakdown
      .filter((b) => b.type === 'investment')
      .reduce((s, b) => s + b.amount, 0);
    const toExcedentTotal = bucketsBreakdown
      .filter((b) => b.type === 'excedent')
      .reduce((s, b) => s + b.amount, 0);

    res.json({
      year: Number(year),
      month: Number(month),
      income: Number(user.monthly_income),
      total_fixed_expenses: Number(fixedExpenses?.total || 0),
      total_daily_expenses: totalDailyExpenses,
      daily_budget: dailyBudget,
      total_available: totalAvailable,
      total_saved: totalSaved > 0 ? totalSaved : 0,
      to_savings: toExcedentTotal,
      to_investment: toInvestmentTotal,
      buckets_breakdown: bucketsBreakdown,
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

// Compare current month vs previous month
router.get('/compare/:year/:month', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.params;
    const y = Number(year);
    const m = Number(month);
    const prevDate = new Date(y, m - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;

    const getMonthData = async (yy: number, mm: number) => {
      const total = await db('daily_expenses')
        .where({ user_id: req.user!.id })
        .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [mm, yy])
        .sum('amount as total')
        .first();

      const byCat = await db('daily_expenses')
        .where({ user_id: req.user!.id })
        .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [mm, yy])
        .groupBy('category')
        .select('category')
        .sum('amount as total');

      return {
        total: Number(total?.total || 0),
        by_category: byCat.map((c) => ({ category: c.category, total: Number(c.total) })),
      };
    };

    const current = await getMonthData(y, m);
    const previous = await getMonthData(prevYear, prevMonth);

    // Combine categories
    const catMap: Record<string, { current: number; previous: number }> = {};
    current.by_category.forEach((c) => {
      catMap[c.category] = { current: c.total, previous: 0 };
    });
    previous.by_category.forEach((c) => {
      if (catMap[c.category]) {
        catMap[c.category].previous = c.total;
      } else {
        catMap[c.category] = { current: 0, previous: c.total };
      }
    });

    const categories = Object.entries(catMap).map(([name, vals]) => ({
      category: name,
      current: vals.current,
      previous: vals.previous,
      diff: vals.current - vals.previous,
      diff_percent: vals.previous > 0 ? ((vals.current - vals.previous) / vals.previous) * 100 : null,
    }));

    res.json({
      current: { year: y, month: m, total: current.total },
      previous: { year: prevYear, month: prevMonth, total: previous.total },
      diff: current.total - previous.total,
      diff_percent: previous.total > 0 ? ((current.total - previous.total) / previous.total) * 100 : null,
      categories,
    });
  } catch (error) {
    console.error('Compare stats error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Day of week analysis (last 90 days)
router.get('/by-weekday', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const days = Number(req.query.days || 90);
    const result = await db('daily_expenses')
      .where({ user_id: req.user!.id })
      .whereRaw(`date >= CURRENT_DATE - INTERVAL '${days} days'`)
      .select(db.raw('EXTRACT(DOW FROM date) as dow'))
      .sum('amount as total')
      .count('* as count')
      .groupBy('dow')
      .orderBy('dow');

    // Postgres DOW: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Map to readable
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const data = dayNames.map((name, i) => {
      const row = result.find((r) => Number(r.dow) === i);
      return {
        day: name,
        day_index: i,
        total: Number(row?.total || 0),
        count: Number(row?.count || 0),
        avg: row && Number(row.count) > 0 ? Number(row.total) / Number(row.count) : 0,
      };
    });

    // Reorder: Mon-Sun
    const ordered = [...data.slice(1), data[0]];

    res.json({ days, by_weekday: ordered });
  } catch (error) {
    console.error('Weekday stats error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Trends - average per day/week/month + by category over time (last N months)
router.get('/trends', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const months = Number(req.query.months || 6);

    // Per-month totals and by-category
    const trend: Array<{ year: number; month: number; total: number; categories: Record<string, number> }> = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      const monthRows = await db('daily_expenses')
        .where({ user_id: req.user!.id })
        .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [m, y])
        .groupBy('category')
        .select('category')
        .sum('amount as total');

      const cats: Record<string, number> = {};
      let total = 0;
      monthRows.forEach((r) => {
        cats[r.category] = Number(r.total);
        total += Number(r.total);
      });

      trend.push({ year: y, month: m, total, categories: cats });
    }

    // Averages
    const totalSpent = trend.reduce((sum, t) => sum + t.total, 0);
    const totalDays = months * 30; // approx
    const avgPerDay = totalDays > 0 ? totalSpent / totalDays : 0;
    const avgPerWeek = avgPerDay * 7;
    const avgPerMonth = months > 0 ? totalSpent / months : 0;

    // By category averages
    const allCats = new Set<string>();
    trend.forEach((t) => Object.keys(t.categories).forEach((c) => allCats.add(c)));
    const catAverages = Array.from(allCats).map((cat) => {
      const total = trend.reduce((sum, t) => sum + (t.categories[cat] || 0), 0);
      return { category: cat, total, avg_per_month: total / months };
    }).sort((a, b) => b.total - a.total);

    res.json({
      months,
      trend,
      averages: {
        per_day: avgPerDay,
        per_week: avgPerWeek,
        per_month: avgPerMonth,
      },
      by_category: catAverages,
    });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Forecast for current month based on actual pace
router.get('/forecast', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await autoCloseDays(req.user!.id);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysRemaining = daysInMonth - today;

    const user = await db('users').where({ id: req.user!.id }).first();
    if (!user || !user.monthly_income || Number(user.monthly_income) <= 0) {
      res.json({ available: false });
      return;
    }

    const fixedExpensesRow = await db('fixed_expenses')
      .where({ user_id: req.user!.id, active: true })
      .sum('amount as total')
      .first();
    const fixedTotal = Number(fixedExpensesRow?.total || 0);
    const monthBudget = Number(user.monthly_income) - fixedTotal;
    const dailyBudget = monthBudget / daysInMonth;

    // Spent so far this month
    const spentSoFar = await db('daily_expenses')
      .where({ user_id: req.user!.id })
      .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [month, year])
      .sum('amount as total')
      .first();
    const spent = Number(spentSoFar?.total || 0);

    // Avg daily spending so far this month
    const avgDailySoFar = today > 0 ? spent / today : 0;

    // Projected total = what's spent + (avg pace * remaining days)
    const projectedTotal = spent + avgDailySoFar * daysRemaining;
    const projectedSurplus = monthBudget - projectedTotal;
    const projectedSavings = projectedSurplus > 0 ? projectedSurplus : 0;
    const projectedToInvestment = projectedSavings * (Number(user.investment_percent) / 100);
    const projectedToExcedent = projectedSavings * (Number(user.savings_percent) / 100);

    // Compare with budget pace
    const expectedSpentSoFar = dailyBudget * today;
    const overUnder = spent - expectedSpentSoFar;

    // Status: on_track / over / under
    let status: 'on_track' | 'over' | 'under' = 'on_track';
    const tolerance = monthBudget * 0.05; // 5%
    if (overUnder > tolerance) status = 'over';
    else if (overUnder < -tolerance) status = 'under';

    // Get current excedent balance
    const lastBalance = await db('daily_balances')
      .where({ user_id: req.user!.id })
      .orderBy('date', 'desc')
      .first();
    const currentExcedent = lastBalance ? Number(lastBalance.excedent_balance) : 0;
    const projectedFinalExcedent = currentExcedent + projectedToExcedent;

    res.json({
      available: true,
      year,
      month,
      day: today,
      days_in_month: daysInMonth,
      days_remaining: daysRemaining,
      month_budget: monthBudget,
      daily_budget: dailyBudget,
      spent_so_far: spent,
      avg_daily_so_far: avgDailySoFar,
      expected_spent_so_far: expectedSpentSoFar,
      over_under: overUnder,
      status,
      projected_total: projectedTotal,
      projected_surplus: projectedSurplus,
      projected_to_investment: projectedToInvestment,
      projected_to_excedent: projectedToExcedent,
      current_excedent: currentExcedent,
      projected_final_excedent: projectedFinalExcedent,
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
