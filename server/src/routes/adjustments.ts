import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';
import { getExcedentDelta, getMonthRemainingDelta } from '../services/adjustments';
import { autoCloseDays } from '../services/dailyClose';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const items = await db('manual_adjustments')
      .where({ user_id: req.user!.id })
      .orderBy('created_at', 'desc')
      .limit(100);
    res.json({ adjustments: items });
  } catch (error) {
    console.error('Get adjustments error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Body: { type, target_value, description }
 * Computes the delta vs current value and stores it.
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await autoCloseDays(req.user!.id);

    const userId = req.user!.id;
    const { type, target_value, description } = req.body;

    if (type !== 'excedent' && type !== 'month_remaining') {
      res.status(400).json({ error: 'type debe ser "excedent" o "month_remaining"' });
      return;
    }
    if (typeof target_value !== 'number' || !Number.isFinite(target_value)) {
      res.status(400).json({ error: 'target_value inválido' });
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    let previousValue = 0;

    if (type === 'excedent') {
      // current excedent = last daily_balances + existing deltas
      const lastBalance = await db('daily_balances')
        .where({ user_id: userId })
        .orderBy('date', 'desc')
        .first();
      const baseExcedent = lastBalance ? Number(lastBalance.excedent_balance) : 0;
      const currentDelta = await getExcedentDelta(userId);
      previousValue = baseExcedent + currentDelta;
    } else {
      // month_remaining = (income - fixed) - month_spent + existing deltas
      const user = await db('users').where({ id: userId }).first();
      const fixedRow = await db('fixed_expenses')
        .where({ user_id: userId, active: true })
        .sum('amount as total')
        .first();
      const monthBudget = Math.max(0, Number(user?.monthly_income || 0) - Number(fixedRow?.total || 0));
      const monthSpentRow = await db('daily_expenses')
        .where({ user_id: userId })
        .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [month, year])
        .sum('amount as total')
        .first();
      const monthSpent = Number(monthSpentRow?.total || 0);
      const currentDelta = await getMonthRemainingDelta(userId, year, month);
      previousValue = monthBudget - monthSpent + currentDelta;
    }

    const delta = Number(target_value) - previousValue;

    if (Math.abs(delta) < 0.01) {
      res.status(400).json({ error: 'El valor objetivo es igual al actual, no hay nada que ajustar' });
      return;
    }

    const [created] = await db('manual_adjustments')
      .insert({
        user_id: userId,
        type,
        delta,
        previous_value: previousValue,
        target_value,
        description: description || null,
        applied_date: todayStr,
      })
      .returning('*');

    res.status(201).json(created);
  } catch (error) {
    console.error('Create adjustment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await db('manual_adjustments')
      .where({ id: String(req.params.id), user_id: req.user!.id })
      .del();
    if (!deleted) {
      res.status(404).json({ error: 'Ajuste no encontrado' });
      return;
    }
    res.json({ message: 'Ajuste revertido' });
  } catch (error) {
    console.error('Delete adjustment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
