import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import db from '../database/connection';
import { autoCloseDays } from '../services/dailyClose';

const router = Router();

interface Insight {
  id: string;
  icon: 'sparkles' | 'up' | 'down' | 'calendar' | 'trophy' | 'alert' | 'flame';
  title: string;
  description: string;
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await autoCloseDays(req.user!.id);
    const insights: Insight[] = [];
    const userId = req.user!.id;

    // Streak of positive days (consecutive)
    const recent = await db('daily_balances')
      .where({ user_id: userId })
      .orderBy('date', 'desc')
      .limit(30);

    let streak = 0;
    for (const day of recent) {
      if (Number(day.surplus) >= 0) streak++;
      else break;
    }

    if (streak >= 3) {
      insights.push({
        id: 'streak',
        icon: 'flame',
        title: `${streak} días seguidos en positivo 🔥`,
        description: streak >= 7 ? 'Estás en racha. Seguí así.' : 'Buen ritmo, no aflojes.',
        tone: 'positive',
      });
    }

    // Compare current month vs previous
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const prevDate = new Date(currentYear, currentMonth - 2, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();

    const currentTotal = await db('daily_expenses')
      .where({ user_id: userId })
      .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [currentMonth, currentYear])
      .sum('amount as total')
      .first();

    const prevTotal = await db('daily_expenses')
      .where({ user_id: userId })
      .whereRaw('EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?', [prevMonth, prevYear])
      .sum('amount as total')
      .first();

    const currentNum = Number(currentTotal?.total || 0);
    const prevNum = Number(prevTotal?.total || 0);

    if (prevNum > 0 && currentNum > 0) {
      const diffPercent = ((currentNum - prevNum) / prevNum) * 100;
      if (Math.abs(diffPercent) >= 10) {
        if (diffPercent < 0) {
          insights.push({
            id: 'less-than-prev',
            icon: 'down',
            title: `Gastás ${Math.abs(diffPercent).toFixed(0)}% menos que el mes pasado`,
            description: 'Buen progreso comparado con el período anterior.',
            tone: 'positive',
          });
        } else {
          insights.push({
            id: 'more-than-prev',
            icon: 'up',
            title: `Gastás ${diffPercent.toFixed(0)}% más que el mes pasado`,
            description: 'Mantenete atento al ritmo de gasto.',
            tone: 'warning',
          });
        }
      }
    }

    // Top category last 30 days
    const topCat = await db('daily_expenses')
      .where({ user_id: userId })
      .whereRaw("date >= CURRENT_DATE - INTERVAL '30 days'")
      .groupBy('category')
      .select('category')
      .sum('amount as total')
      .orderBy('total', 'desc')
      .first();

    if (topCat && Number(topCat.total) > 0) {
      insights.push({
        id: 'top-cat',
        icon: 'sparkles',
        title: `Más gastás en ${topCat.category}`,
        description: `$${Number(topCat.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })} en los últimos 30 días.`,
        tone: 'neutral',
      });
    }

    // Heaviest weekday last 90 days
    const byDow = await db('daily_expenses')
      .where({ user_id: userId })
      .whereRaw("date >= CURRENT_DATE - INTERVAL '90 days'")
      .select(db.raw('EXTRACT(DOW FROM date) as dow'))
      .sum('amount as total')
      .groupBy('dow');

    if (byDow.length >= 3) {
      const dayNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
      const top = byDow.reduce((max, r) => (Number(r.total) > Number(max.total) ? r : max));
      const totalAll = byDow.reduce((sum, r) => sum + Number(r.total), 0);
      const topShare = (Number(top.total) / totalAll) * 100;

      if (topShare >= 20) {
        insights.push({
          id: 'top-dow',
          icon: 'calendar',
          title: `Los ${dayNames[Number(top.dow)]} son tu día caro`,
          description: `${topShare.toFixed(0)}% de tu gasto semanal cae ahí.`,
          tone: 'neutral',
        });
      }
    }

    // Best month so far this year
    const yearMonths = await db('daily_balances')
      .where({ user_id: userId })
      .whereRaw('EXTRACT(YEAR FROM date) = ?', [currentYear])
      .select(db.raw('EXTRACT(MONTH FROM date) as month'))
      .sum('to_excedent as saved')
      .sum('to_investment as invested')
      .groupBy('month');

    if (yearMonths.length >= 2) {
      const best = yearMonths.reduce((max, r) => {
        const total = Number(r.saved) + Number(r.invested);
        const maxTotal = Number(max.saved) + Number(max.invested);
        return total > maxTotal ? r : max;
      });

      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const totalSaved = Number(best.saved) + Number(best.invested);

      if (totalSaved > 0) {
        insights.push({
          id: 'best-month',
          icon: 'trophy',
          title: `Tu mejor mes fue ${monthNames[Number(best.month) - 1]}`,
          description: `Ahorraste $${totalSaved.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ese mes.`,
          tone: 'positive',
        });
      }
    }

    // Today anomaly: spent 2x more than avg
    const today = new Date().toISOString().split('T')[0];
    const todaySpent = await db('daily_expenses')
      .where({ user_id: userId, date: today })
      .sum('amount as total')
      .first();

    const avgDaily = await db('daily_expenses')
      .where({ user_id: userId })
      .whereRaw("date >= CURRENT_DATE - INTERVAL '30 days'")
      .whereRaw("date < CURRENT_DATE")
      .avg(db.raw('daily_total'))
      .from(
        db('daily_expenses')
          .where({ user_id: userId })
          .whereRaw("date >= CURRENT_DATE - INTERVAL '30 days'")
          .whereRaw("date < CURRENT_DATE")
          .select('date')
          .sum('amount as daily_total')
          .groupBy('date')
          .as('per_day')
      )
      .first() as { avg: string | null } | undefined;

    const todayNum = Number(todaySpent?.total || 0);
    const avgNum = Number(avgDaily?.avg || 0);

    if (avgNum > 0 && todayNum > avgNum * 2) {
      insights.push({
        id: 'today-anomaly',
        icon: 'alert',
        title: `Hoy gastaste ${(todayNum / avgNum).toFixed(1)}x tu promedio`,
        description: `Tu promedio diario es $${avgNum.toLocaleString('es-AR', { maximumFractionDigits: 0 })}.`,
        tone: 'warning',
      });
    }

    res.json({ insights });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
