import { Router, Response } from 'express';
import { AuthRequest, authenticate, requireAdmin } from '../middleware/auth';
import db from '../database/connection';

const router = Router();

// Get all users (admin only)
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await db('users')
      .select('id', 'email', 'name', 'role', 'monthly_income', 'created_at')
      .orderBy('created_at', 'desc');

    res.json(users);
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get platform stats (admin only)
router.get('/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await db('users').count('* as count').first();
    const totalExpenses = await db('daily_expenses').count('* as count').first();
    const totalFixedExpenses = await db('fixed_expenses').count('* as count').first();

    // Users registered this month
    const now = new Date();
    const newUsersThisMonth = await db('users')
      .whereRaw('EXTRACT(MONTH FROM created_at) = ? AND EXTRACT(YEAR FROM created_at) = ?', [
        now.getMonth() + 1,
        now.getFullYear(),
      ])
      .count('* as count')
      .first();

    res.json({
      total_users: Number(totalUsers?.count || 0),
      total_expenses_recorded: Number(totalExpenses?.count || 0),
      total_fixed_expenses: Number(totalFixedExpenses?.count || 0),
      new_users_this_month: Number(newUsersThisMonth?.count || 0),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Rol inválido' });
      return;
    }

    const [user] = await db('users')
      .where({ id: req.params.id })
      .update({ role })
      .returning(['id', 'email', 'name', 'role']);

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: 'No podés eliminarte a vos mismo' });
      return;
    }

    const deleted = await db('users').where({ id: req.params.id }).del();

    if (!deleted) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
