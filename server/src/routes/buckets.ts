import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';
import { getBuckets, totalPercent } from '../services/buckets';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const buckets = await getBuckets(req.user!.id);
    res.json({ buckets, total_percent: totalPercent(buckets) });
  } catch (error) {
    console.error('Get buckets error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Replace the user's bucket configuration in one shot.
 * Accepts an array; total percent must be 100.
 */
router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { buckets } = req.body as {
      buckets: Array<{
        name: string;
        percent: number;
        type?: 'investment' | 'excedent' | 'custom';
        color?: string;
        sort_order?: number;
        description?: string | null;
      }>;
    };

    if (!Array.isArray(buckets) || buckets.length === 0) {
      res.status(400).json({ error: 'Se requiere al menos un bucket' });
      return;
    }

    // Validate
    let total = 0;
    for (const b of buckets) {
      if (!b.name || !b.name.trim()) {
        res.status(400).json({ error: 'Cada bucket debe tener nombre' });
        return;
      }
      const pct = Number(b.percent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        res.status(400).json({ error: 'Porcentajes inválidos' });
        return;
      }
      total += pct;
    }

    // Allow tiny floating point errors
    if (Math.abs(total - 100) > 0.01) {
      res.status(400).json({ error: `Los porcentajes deben sumar 100% (suma actual: ${total}%)` });
      return;
    }

    await db.transaction(async (trx) => {
      await trx('distribution_buckets').where({ user_id: userId }).del();
      const rows = buckets.map((b, i) => ({
        user_id: userId,
        name: b.name.trim(),
        percent: Number(b.percent),
        type: b.type || 'custom',
        color: b.color || '#9BA9B4',
        sort_order: typeof b.sort_order === 'number' ? b.sort_order : i,
        description: b.description?.trim() || null,
      }));
      if (rows.length > 0) {
        await trx('distribution_buckets').insert(rows);
      }

      // Sync legacy columns on users table for backwards compatibility:
      // total investment % = sum of buckets type=investment
      // savings_percent (excedent) = sum of buckets type=excedent
      const investmentTotal = rows
        .filter((r) => r.type === 'investment')
        .reduce((s, r) => s + Number(r.percent), 0);
      const excedentTotal = rows
        .filter((r) => r.type === 'excedent')
        .reduce((s, r) => s + Number(r.percent), 0);

      // Use the first investment bucket's description as legacy "investment_destination"
      const investmentDesc = rows.find((r) => r.type === 'investment')?.description || '';

      await trx('users')
        .where({ id: userId })
        .update({
          investment_percent: investmentTotal,
          savings_percent: excedentTotal,
          investment_destination: investmentDesc,
          updated_at: new Date(),
        });
    });

    const updated = await getBuckets(userId);
    res.json({ buckets: updated, total_percent: totalPercent(updated) });
  } catch (error) {
    console.error('Update buckets error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
