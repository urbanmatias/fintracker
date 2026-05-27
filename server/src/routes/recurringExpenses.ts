import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const items = await db('recurring_expenses')
      .where({ user_id: req.user!.id })
      .orderBy('day_of_month');
    res.json(items);
  } catch (error) {
    console.error('Get recurring error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, amount, category, day_of_month } = req.body;

    if (!name || !amount || !category || !day_of_month) {
      res.status(400).json({ error: 'Todos los campos son requeridos' });
      return;
    }
    if (day_of_month < 1 || day_of_month > 31) {
      res.status(400).json({ error: 'Día del mes inválido' });
      return;
    }

    const [item] = await db('recurring_expenses')
      .insert({
        user_id: req.user!.id,
        name,
        amount,
        category,
        day_of_month,
      })
      .returning('*');

    res.status(201).json(item);
  } catch (error) {
    console.error('Create recurring error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, amount, category, day_of_month, active } = req.body;

    const [updated] = await db('recurring_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .update({ name, amount, category, day_of_month, active, updated_at: new Date() })
      .returning('*');

    if (!updated) {
      res.status(404).json({ error: 'Gasto recurrente no encontrado' });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error('Update recurring error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await db('recurring_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .del();

    if (!deleted) {
      res.status(404).json({ error: 'Gasto recurrente no encontrado' });
      return;
    }

    res.json({ message: 'Gasto recurrente eliminado' });
  } catch (error) {
    console.error('Delete recurring error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Generate the daily_expense entry for a recurring item (one-click "I paid this")
router.post('/:id/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.body;

    const item = await db('recurring_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .first();

    if (!item) {
      res.status(404).json({ error: 'Gasto recurrente no encontrado' });
      return;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    const [expense] = await db('daily_expenses')
      .insert({
        user_id: req.user!.id,
        amount: item.amount,
        description: item.name,
        category: item.category,
        date: targetDate,
      })
      .returning('*');

    res.status(201).json(expense);
  } catch (error) {
    console.error('Generate recurring error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
