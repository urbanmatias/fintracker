import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';
import { autoCloseDays } from '../services/dailyClose';

const router = Router();

// Get all investments + summary
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await autoCloseDays(req.user!.id);

    const investments = await db('investments')
      .where({ user_id: req.user!.id })
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc');

    const totalInvested = investments.reduce((sum, i) => sum + Number(i.amount), 0);

    // Total recommended (sum of all to_investment from closed days)
    const recommended = await db('daily_balances')
      .where({ user_id: req.user!.id })
      .sum('to_investment as total')
      .first();

    const totalRecommended = Number(recommended?.total || 0);
    const diff = totalInvested - totalRecommended;

    // By month for chart
    const byMonth = await db('investments')
      .where({ user_id: req.user!.id })
      .select(
        db.raw("TO_CHAR(date, 'YYYY-MM') as month"),
      )
      .sum('amount as total')
      .groupBy('month')
      .orderBy('month');

    res.json({
      investments,
      total_invested: totalInvested,
      total_recommended: totalRecommended,
      diff,
      diff_percent: totalRecommended > 0 ? (diff / totalRecommended) * 100 : null,
      by_month: byMonth.map((m) => ({ month: m.month, total: Number(m.total) })),
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, date, description, ticker, quantity, price_per_unit, platform } = req.body;

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'El monto es requerido y debe ser mayor a 0' });
      return;
    }

    const [item] = await db('investments')
      .insert({
        user_id: req.user!.id,
        amount,
        date: date || new Date().toISOString().split('T')[0],
        description: description || null,
        ticker: ticker || null,
        quantity: quantity || null,
        price_per_unit: price_per_unit || null,
        platform: platform || null,
      })
      .returning('*');

    res.status(201).json(item);
  } catch (error) {
    console.error('Create investment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, date, description, ticker, quantity, price_per_unit, platform } = req.body;

    const update: Record<string, unknown> = { updated_at: new Date() };
    if (amount !== undefined) update.amount = amount;
    if (date !== undefined) update.date = date;
    if (description !== undefined) update.description = description;
    if (ticker !== undefined) update.ticker = ticker;
    if (quantity !== undefined) update.quantity = quantity;
    if (price_per_unit !== undefined) update.price_per_unit = price_per_unit;
    if (platform !== undefined) update.platform = platform;

    const [updated] = await db('investments')
      .where({ id: req.params.id, user_id: req.user!.id })
      .update(update)
      .returning('*');

    if (!updated) {
      res.status(404).json({ error: 'Inversión no encontrada' });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error('Update investment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await db('investments')
      .where({ id: req.params.id, user_id: req.user!.id })
      .del();

    if (!deleted) {
      res.status(404).json({ error: 'Inversión no encontrada' });
      return;
    }

    res.json({ message: 'Inversión eliminada' });
  } catch (error) {
    console.error('Delete investment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
