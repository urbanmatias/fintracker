import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;
    let q = db('categories').where({ user_id: req.user!.id });
    if (type) q = q.where({ type: String(type) });
    const cats = await q.orderBy('sort_order').orderBy('name');
    res.json(cats);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, color } = req.body;

    if (!name || !type || !['daily', 'fixed'].includes(type)) {
      res.status(400).json({ error: 'Nombre y tipo (daily/fixed) son requeridos' });
      return;
    }

    const [cat] = await db('categories')
      .insert({
        user_id: req.user!.id,
        name,
        type,
        color: color || '#9BA9B4',
      })
      .returning('*');

    res.status(201).json(cat);
  } catch (error: unknown) {
    const dbErr = error as { code?: string };
    if (dbErr.code === '23505') {
      res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      return;
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, sort_order } = req.body;
    const update: Record<string, unknown> = { updated_at: new Date() };
    if (name !== undefined) update.name = name;
    if (color !== undefined) update.color = color;
    if (sort_order !== undefined) update.sort_order = sort_order;

    const [updated] = await db('categories')
      .where({ id: req.params.id, user_id: req.user!.id })
      .update(update)
      .returning('*');

    if (!updated) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cat = await db('categories')
      .where({ id: req.params.id, user_id: req.user!.id })
      .first();

    if (!cat) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    // Check if any expense uses it
    const table = cat.type === 'daily' ? 'daily_expenses' : 'fixed_expenses';
    const inUse = await db(table)
      .where({ user_id: req.user!.id, category: cat.name })
      .count('* as count')
      .first();

    if (Number(inUse?.count || 0) > 0) {
      res.status(409).json({ error: `No se puede eliminar: hay ${inUse?.count} gastos en esta categoría` });
      return;
    }

    await db('categories').where({ id: req.params.id }).del();
    res.json({ message: 'Categoría eliminada' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
