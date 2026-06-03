import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, Sparkles, AlertTriangle, Trophy } from 'lucide-react';
import api from '../api/client';

interface Forecast {
  available: boolean;
  year?: number;
  month?: number;
  day?: number;
  days_in_month?: number;
  days_remaining?: number;
  month_budget?: number;
  daily_budget?: number;
  spent_so_far?: number;
  avg_daily_so_far?: number;
  expected_spent_so_far?: number;
  over_under?: number;
  status?: 'on_track' | 'over' | 'under';
  projected_total?: number;
  projected_surplus?: number;
  projected_to_investment?: number;
  projected_to_excedent?: number;
  current_excedent?: number;
  projected_final_excedent?: number;
}

interface Props {
  refreshKey: number;
}

interface Tone {
  Icon: typeof Target;
  cardClass: string;
  iconClass: string;
  badgeText: string;
  title: string;
  description: string;
}

function buildTone(data: Forecast): Tone {
  const surplus = data.projected_surplus || 0;
  const monthBudget = data.month_budget || 0;
  const surplusPercent = monthBudget > 0 ? (surplus / monthBudget) * 100 : 0;
  const monthName = new Date(data.year!, data.month! - 1).toLocaleString('es-AR', { month: 'long' });
  const daysLeft = data.days_remaining || 0;
  const investment = data.projected_to_investment || 0;
  const finalExcedent = data.projected_final_excedent || 0;

  // Negative projection — danger
  if (surplus < 0) {
    return {
      Icon: AlertTriangle,
      cardClass: 'border-danger/30 bg-danger/[0.05]',
      iconClass: 'text-danger',
      badgeText: 'En rojo',
      title: `Vas a cerrar el mes con $${Math.abs(surplus).toLocaleString('es-AR', { maximumFractionDigits: 0 })} en rojo`,
      description: daysLeft > 0
        ? `Tenés ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} para recortar el ritmo y dar vuelta el mes. Si frenás ahora todavía estás a tiempo.`
        : `El mes terminó arriba del presupuesto. Se descuenta del excedente acumulado ($${(data.current_excedent || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}).`,
    };
  }

  // Tiny surplus (less than 5% of budget) — meh
  if (surplusPercent < 5) {
    return {
      Icon: TrendingDown,
      cardClass: 'border-warning/30 bg-warning/[0.05]',
      iconClass: 'text-warning',
      badgeText: 'Apretado',
      title: `Vas a cerrar con apenas $${surplus.toLocaleString('es-AR', { maximumFractionDigits: 0 })} de sobrante`,
      description: daysLeft > 0
        ? `Si recortás un poco los próximos ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} podés terminar el mes con un excedente decente para invertir.`
        : `Quedó poco margen. A inversión van solo $${investment.toLocaleString('es-AR', { maximumFractionDigits: 0 })}.`,
    };
  }

  // Decent surplus (5-15%) — good
  if (surplusPercent < 15) {
    return {
      Icon: Sparkles,
      cardClass: 'border-secondary/30 bg-secondary/[0.05]',
      iconClass: 'text-secondary',
      badgeText: 'Bien',
      title: `Si seguís así, ${monthName} cierra con $${surplus.toLocaleString('es-AR', { maximumFractionDigits: 0 })} de excedente`,
      description: `Vas en buen ritmo. A inversión irían $${investment.toLocaleString('es-AR', { maximumFractionDigits: 0 })} el último día del mes.`,
    };
  }

  // Great surplus (15-30%) — keep going
  if (surplusPercent < 30) {
    return {
      Icon: TrendingUp,
      cardClass: 'border-primary/30 bg-primary/[0.05]',
      iconClass: 'text-primary',
      badgeText: 'En camino',
      title: `Excelente: vas a invertir $${investment.toLocaleString('es-AR', { maximumFractionDigits: 0 })} este mes`,
      description: `Si mantenés el pace, ${monthName} cierra con $${surplus.toLocaleString('es-AR', { maximumFractionDigits: 0 })} sobrantes. Tu colchón total quedaría en $${finalExcedent.toLocaleString('es-AR', { maximumFractionDigits: 0 })}.`,
    };
  }

  // Killer month (>30%) — record territory
  return {
    Icon: Trophy,
    cardClass: 'border-primary/40 bg-primary/[0.07]',
    iconClass: 'text-primary',
    badgeText: 'Mes récord',
    title: `Mes récord en camino: $${surplus.toLocaleString('es-AR', { maximumFractionDigits: 0 })} de sobrante proyectado`,
    description: `A este ritmo invertís $${investment.toLocaleString('es-AR', { maximumFractionDigits: 0 })} el último día. Tu excedente quedaría en $${finalExcedent.toLocaleString('es-AR', { maximumFractionDigits: 0 })}.`,
  };
}

export default function ForecastCard({ refreshKey }: Props) {
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats/forecast')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading || !data?.available) return null;

  const tone = buildTone(data);
  const { Icon } = tone;

  // Progress bar: actual vs expected
  const monthProgressPct = data.days_in_month! > 0 ? (data.day! / data.days_in_month!) * 100 : 0;
  const actualSpentPct = (data.month_budget || 0) > 0 ? ((data.spent_so_far || 0) / (data.month_budget || 1)) * 100 : 0;

  const surplus = data.projected_surplus || 0;
  const isNegative = surplus < 0;
  const isOver = (data.over_under || 0) > 0;

  return (
    <div className={`rounded-2xl p-5 md:p-6 border ${tone.cardClass} fade-in`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-current/10 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${tone.iconClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold">Pronóstico del mes</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${tone.iconClass} bg-current/10`}>
              {tone.badgeText}
            </span>
          </div>
          <p className={`font-semibold text-sm mt-1 ${tone.iconClass}`}>{tone.title}</p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{tone.description}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-text-muted mb-1.5">
          <span>Día {data.day} de {data.days_in_month}</span>
          <span>{actualSpentPct.toFixed(0)}% del presupuesto</span>
        </div>
        <div className="relative h-2 bg-border rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-text/40 z-10"
            style={{ left: `${Math.min(monthProgressPct, 100)}%` }}
            title="Día actual"
          />
          <div
            className={`h-full rounded-full transition-all ${
              isNegative ? 'bg-danger' : isOver ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(actualSpentPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
          <span>${(data.spent_so_far || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} gastados</span>
          <span>${(data.month_budget || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Projected breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-current/10">
        <div>
          <p className="text-[10px] text-text-muted uppercase">Promedio diario</p>
          <p className="money text-sm font-semibold mt-0.5">
            ${(data.avg_daily_so_far || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase">Pronóstico</p>
          <p className="money text-sm font-semibold mt-0.5">
            ${(data.projected_total || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase">A inversión</p>
          <p className={`money text-sm font-semibold mt-0.5 ${isNegative ? 'text-text-muted' : 'text-primary'}`}>
            ${(data.projected_to_investment || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
}
