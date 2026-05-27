import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';

const router = Router();

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db('users')
      .where({ id: req.user!.id })
      .select('id', 'email', 'name', 'role', 'monthly_income', 'savings_percent', 'investment_percent', 'investment_destination')
      .first();

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update user settings (income, distribution rule)
router.put('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { monthly_income, savings_percent, investment_percent, investment_destination } = req.body;

    // Validate percentages add up to 100
    if (savings_percent !== undefined && investment_percent !== undefined) {
      if (Number(savings_percent) + Number(investment_percent) !== 100) {
        res.status(400).json({ error: 'Los porcentajes deben sumar 100%' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (monthly_income !== undefined) updateData.monthly_income = monthly_income;
    if (savings_percent !== undefined) updateData.savings_percent = savings_percent;
    if (investment_percent !== undefined) updateData.investment_percent = investment_percent;
    if (investment_destination !== undefined) updateData.investment_destination = investment_destination;

    const [updated] = await db('users')
      .where({ id: req.user!.id })
      .update(updateData)
      .returning(['id', 'email', 'name', 'role', 'monthly_income', 'savings_percent', 'investment_percent', 'investment_destination']);

    res.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
