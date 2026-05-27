import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';

const router = Router();

// Get all fixed expenses for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await db('fixed_expenses')
      .where({ user_id: req.user!.id })
      .orderBy('created_at', 'desc');

    res.json(expenses);
  } catch (error) {
    console.error('Get fixed expenses error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create fixed expense
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, amount, category } = req.body;

    if (!name || !amount || !category) {
      res.status(400).json({ error: 'Nombre, monto y categoría son requeridos' });
      return;
    }

    const [expense] = await db('fixed_expenses')
      .insert({
        user_id: req.user!.id,
        name,
        amount,
        category,
      })
      .returning('*');

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create fixed expense error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update fixed expense
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, amount, category, active } = req.body;

    const [expense] = await db('fixed_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .update({ name, amount, category, active, updated_at: new Date() })
      .returning('*');

    if (!expense) {
      res.status(404).json({ error: 'Gasto fijo no encontrado' });
      return;
    }

    res.json(expense);
  } catch (error) {
    console.error('Update fixed expense error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete fixed expense
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await db('fixed_expenses')
      .where({ id: req.params.id, user_id: req.user!.id })
      .del();

    if (!deleted) {
      res.status(404).json({ error: 'Gasto fijo no encontrado' });
      return;
    }

    res.json({ message: 'Gasto fijo eliminado' });
  } catch (error) {
    console.error('Delete fixed expense error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
